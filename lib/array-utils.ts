/**
 * Moves an item from one index to another in an array
 */
export function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const newArray = [...array]
  const item = newArray.splice(from, 1)[0]
  newArray.splice(to, 0, item)
  return newArray
}

/**
 * Inserts an item at a specific index
 */
export function arrayInsert<T>(array: T[], index: number, item: T): T[] {
  const newArray = [...array]
  newArray.splice(index, 0, item)
  return newArray
}

/**
 * Removes an item at a specific index
 */
export function arrayRemove<T>(array: T[], index: number): T[] {
  const newArray = [...array]
  newArray.splice(index, 1)
  return newArray
}

/**
 * Swaps two items in an array
 */
export function arraySwap<T>(array: T[], indexA: number, indexB: number): T[] {
  const newArray = [...array]
  const temp = newArray[indexA]
  newArray[indexA] = newArray[indexB]
  newArray[indexB] = temp
  return newArray
}

/**
 * Reorders an array based on a new order of indices
 */
export function arrayReorder<T>(array: T[], newOrder: number[]): T[] {
  return newOrder.map((index) => array[index])
}
