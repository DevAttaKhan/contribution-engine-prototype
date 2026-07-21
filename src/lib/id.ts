export const createId = () => crypto.randomUUID();

export const createToken = () =>
  crypto.randomUUID().replace(/-/g, "").slice(0, 16);
