export type ResultOrErrorResponse<T> = [T | null, Error | null];

export const resultOrError = async <T>(promise: Promise<T>) => {
  try {
    const result: T = await promise;
    return [result, null];
  } catch (error) {
    return [null, error];
  }
};
