/**
 * Base Value Object
 * Immutable objects that represent domain concepts
 */

export abstract class ValueObject {
  protected constructor() {
    // Prevent direct instantiation
  }

  /**
   * Deep equality comparison for value objects
   */
  public equals(other: ValueObject): boolean {
    if (!other || other.constructor !== this.constructor) {
      return false;
    }

    const thisProps = Object.getOwnPropertyNames(this);
    const otherProps = Object.getOwnPropertyNames(other);

    if (thisProps.length !== otherProps.length) {
      return false;
    }

    for (const prop of thisProps) {
      const thisValue = (this as any)[prop];
      const otherValue = (other as any)[prop];

      if (thisValue instanceof ValueObject && otherValue instanceof ValueObject) {
        if (!thisValue.equals(otherValue)) {
          return false;
        }
      } else if (thisValue !== otherValue) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get hash code for value object (for use in sets/maps)
   */
  public getHashCode(): string {
    return JSON.stringify(this, Object.keys(this).sort());
  }
}
