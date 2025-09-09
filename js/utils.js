/**
 * Native JavaScript utilities to replace lodash methods
 * These functions provide equivalent functionality to commonly used lodash methods
 */

window.FlipletLinkUtils = {
  /**
   * Check if value is empty
   * Replacement for _.isEmpty()
   * @param {*} value - The value to check
   * @returns {boolean} True if the value is empty, false otherwise
   * @description Checks if a value is empty (null, undefined, empty string, empty array, or empty object)
   * @example
   * FlipletLinkUtils.isEmpty(null); // true
   * FlipletLinkUtils.isEmpty([]); // true
   * FlipletLinkUtils.isEmpty({}); // true
   * FlipletLinkUtils.isEmpty(''); // true
   * FlipletLinkUtils.isEmpty([1, 2, 3]); // false
   */
  isEmpty: function(value) {
    if (value == null) return true;
    if (Array.isArray(value) || typeof value === 'string') return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  },

  /**
   * Find first element matching predicate
   * Replacement for _.find()
   * @param {Array} array - The array to search
   * @param {Function|Object|*} predicate - The function, object, or value to test each element
   * @returns {*} The first matching element or undefined
   * @description Finds the first element in an array that matches the predicate
   * @example
   * FlipletLinkUtils.find([1, 2, 3], x => x > 1); // 2
   * FlipletLinkUtils.find([{a: 1}, {a: 2}], {a: 2}); // {a: 2}
   * FlipletLinkUtils.find([1, 2, 3], 2); // 2
   */
  find: function(array, predicate) {
    if (!array || !Array.isArray(array)) {
      return undefined;
    }
    if (typeof predicate === 'function') {
      return array.find(predicate);
    }
    if (typeof predicate === 'object') {
      return array.find(item => {
        for (let key in predicate) {
          if (predicate.hasOwnProperty(key) && item[key] !== predicate[key]) {
            return false;
          }
        }
        return true;
      });
    }
    return array.find(item => item === predicate);
  },

  /**
   * Check if any element matches predicate
   * Replacement for _.some()
   * @param {Array} array - The array to check
   * @param {Function} predicate - The function to test each element
   * @returns {boolean} True if any element passes the test, false otherwise
   * @description Checks if any element in the array passes the predicate test
   * @example
   * FlipletLinkUtils.some([1, 2, 3], x => x > 2); // true
   * FlipletLinkUtils.some([1, 2, 3], x => x > 5); // false
   */
  some: function(array, predicate) {
    if (!array || !Array.isArray(array)) {
      return false;
    }
    return array.some(predicate);
  }
}; 