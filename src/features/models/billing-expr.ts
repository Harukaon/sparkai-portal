/**
 * New API 动态计费表达式（`billing_expr`）的只读解析，用来在模型广场里显示价格。
 *
 * 后端事实（new-api `pkg/billingexpr`）：
 * - 表达式里的系数就是「美元 / 百万 token」的真实价格，不是倍率；
 * - `p` 输入、`c` 输出、`cr` 缓存命中、`cc` 缓存写入；`len` 是输入上下文总长度；
 * - 缓存价（cr / cc）会被接受但不输出：模型列表不展示缓存价格；
 * - 结算时结果还要再乘分组倍率（本文件只解析，倍率由调用方乘）。
 *
 * 只认两种写法，其余一律返回 `null`，调用方保持「动态计费，请以实际用量为准」：
 *
 *   tier("standard", p * 0.15 + cr * 0.03 + cc * 0 + c * 0.5)
 *   len <= 272000 ? tier("standard", p * 10 + c * 50) : tier("long_context", p * 20 + c * 75)
 *
 * 不认的写法包括：图片/音频分项（img、ai、ao…）、请求参数（`param()`）、任务用量
 * （`u("seconds")`）、`fixed()`、时间折扣、乘除括号等。宁可不显示，也不把看不懂的
 * 表达式猜成一个固定价格。
 */

export interface ExprTier {
  name: string
  /** 输入上下文长度上限（含）。最后一档没有上限，更长的输入都归它 */
  upToLen?: number
  /** 以下均为美元 / 百万 token，未乘分组倍率 */
  input: number
  output: number
}

type Token =
  | { type: 'ident'; value: string }
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'punct'; value: string }

const TOKEN_PATTERN =
  /\s*(?:([A-Za-z_][A-Za-z0-9_]*)|(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|"([^"]*)"|(<=|[(),*+?:<]))/y

/** 表达式里允许出现的变量（cr、cc 是缓存价，接受但不展示）；其它变量会让整条表达式被放弃 */
const PRICED_VARIABLES = new Set(['p', 'c', 'cr', 'cc'])

function tokenize(source: string): Token[] | null {
  const tokens: Token[] = []
  TOKEN_PATTERN.lastIndex = 0
  while (TOKEN_PATTERN.lastIndex < source.length) {
    const start = TOKEN_PATTERN.lastIndex
    const match = TOKEN_PATTERN.exec(source)
    if (!match) return source.slice(start).trim() === '' ? tokens : null
    const [, ident, number, quoted, punct] = match
    if (ident !== undefined) tokens.push({ type: 'ident', value: ident })
    else if (number !== undefined) tokens.push({ type: 'number', value: Number(number) })
    else if (quoted !== undefined) tokens.push({ type: 'string', value: quoted })
    else if (punct !== undefined) tokens.push({ type: 'punct', value: punct })
  }
  return tokens
}

/** 解析失败时抛出，由 parseBillingExpr 统一转成 null */
class Unsupported extends Error {}

class Parser {
  private pos = 0

  constructor(private readonly tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private take(): Token {
    const token = this.tokens[this.pos++]
    if (!token) throw new Unsupported('unexpected end')
    return token
  }

  private expectPunct(value: string) {
    const token = this.take()
    if (token.type !== 'punct' || token.value !== value) throw new Unsupported(`expected ${value}`)
  }

  private expectIdent(value?: string): string {
    const token = this.take()
    if (token.type !== 'ident' || (value !== undefined && token.value !== value)) throw new Unsupported('expected identifier')
    return token.value
  }

  private expectNumber(): number {
    const token = this.take()
    if (token.type !== 'number') throw new Unsupported('expected number')
    return token.value
  }

  done(): boolean {
    return this.pos >= this.tokens.length
  }

  /** expr := 'len' ('<=' | '<') NUMBER '?' tier ':' expr | tier */
  parseExpr(): ExprTier[] {
    const head = this.peek()
    if (head?.type !== 'ident' || head.value !== 'len') return [this.parseTier()]
    this.take()
    const op = this.take()
    if (op.type !== 'punct' || (op.value !== '<=' && op.value !== '<')) throw new Unsupported('len comparison')
    const limit = this.expectNumber()
    this.expectPunct('?')
    const tier = this.parseTier()
    this.expectPunct(':')
    // token 数是整数：len < N 等价于 len <= N - 1
    return [{ ...tier, upToLen: op.value === '<' ? limit - 1 : limit }, ...this.parseExpr()]
  }

  /** tier := 'tier' '(' STRING ',' linear ')' */
  private parseTier(): ExprTier {
    this.expectIdent('tier')
    this.expectPunct('(')
    const name = this.take()
    if (name.type !== 'string') throw new Unsupported('tier name')
    this.expectPunct(',')
    const coefficients = this.parseLinear()
    this.expectPunct(')')
    // 只有输入没有输出（或反过来）无法确定另一侧是免费还是忘了写，不猜
    if (coefficients.p === undefined || coefficients.c === undefined) throw new Unsupported('needs p and c')
    return { name: name.value, input: coefficients.p, output: coefficients.c }
  }

  /** linear := term ('+' term)*，term := VAR '*' NUMBER */
  private parseLinear(): Record<string, number | undefined> {
    const coefficients: Record<string, number | undefined> = {}
    for (;;) {
      const variable = this.expectIdent()
      if (!PRICED_VARIABLES.has(variable)) throw new Unsupported(`variable ${variable}`)
      this.expectPunct('*')
      coefficients[variable] = (coefficients[variable] ?? 0) + this.expectNumber()
      const next = this.peek()
      if (next?.type !== 'punct' || next.value !== '+') return coefficients
      this.take()
    }
  }
}

/**
 * 解析成价格档位；认不出的写法返回 `null`。
 * 分档必须按长度严格递增，否则视为无法确定含义。
 */
export function parseBillingExpr(expression: string): ExprTier[] | null {
  const versioned = /^v(\d+):/.exec(expression.trim())
  if (versioned && versioned[1] !== '1') return null
  const body = versioned ? expression.trim().slice(versioned[0].length) : expression

  const tokens = tokenize(body)
  if (!tokens?.length) return null

  const parser = new Parser(tokens)
  let tiers: ExprTier[]
  try {
    tiers = parser.parseExpr()
  } catch (error) {
    if (error instanceof Unsupported) return null
    throw error
  }
  if (!parser.done()) return null

  let previous = Number.NEGATIVE_INFINITY
  for (const tier of tiers) {
    if (tier.upToLen === undefined) continue
    if (tier.upToLen <= previous) return null
    previous = tier.upToLen
  }
  return tiers
}
