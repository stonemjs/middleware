export const config = {
  values: {},
  set (values) { this.values = values },
  has (value) { return Object.keys(this.values).includes(value) },
  get (key, fallback = null) { return this.values[key] ?? fallback },
  firstMatch (keys, fallback = null) { return this.get(keys.find((v) => this.has(v)), fallback) }
}
