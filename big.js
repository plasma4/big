/** @type {Number} Sets default accuracy (in digits) */
Big.ACCURACY = 100
/** @type {Boolean} Round down numbers when creating creating a Big instance. */
Big.ROUND_DOWN = false

/**
 * Creates a Big instance that represents a finite number, with specified accuracy.
 * @param {string | number | bigint | Big} value The value to set the number to.
 * @param {Number} accuracy The accuracy of the number, in digits.
 * @param {Boolean} strict If set to true, the function requires the 'new' keyword parameters cannot be null.
 */
function Big(value = null, accuracy = null, strict = false) {
    if (!(this instanceof Big)) {
        if (strict) {
            throw TypeError("Big constructor cannot be invoked without 'new'")
        }
        return new Big(value, accuracy)
    }
    var accNull = false
    if (value == null) {
        if (strict) {
            throw TypeError("Cannot use value of " + value + " in Big strict mode")
        }
        value = "0"
    }
    if (accuracy == null) {
        if (strict) {
            throw TypeError("Cannot use accuracy of " + value + " in Big strict mode")
        }
        accNull = true
        accuracy = Big.ACCURACY
    }
    if (value === "0") {
        /** @type {bigint} The value of the Big instance, multiplied by the align of the instance. */
        this.norm = 0n
        if (accuracy == null) {
            /** @type {number} The accuracy of the Big instance in digits. */
            this.accuracy = Big.ACCURACY
        } else {
            this.accuracy = accuracy
        }
        /** @type {bigint} Ten to the power of the accuracy of the Big instance. */
        this.align = 10n ** BigInt(this.accuracy)
        return
    }
    if (!accNull) {
        var orgAcc = accuracy
        if (typeof accuracy !== "number") {
            accuracy = Number(accuracy)
        }
        if (isNaN(accuracy)) {
            throw RangeError("The accuracy of " + orgAcc + " cannot be used because it is not a finite value.")
        } else if (accuracy < 1) {
            throw RangeError("The accuracy of " + orgAcc + " is out of range.")
        } else if (accuracy > 320000000) {
            throw RangeError("Maximum Big size exceeded")
        }
    }
    accuracy = Math.ceil(accuracy)
    if (value instanceof Big) {
        this.norm = value.norm
        if (accNull) {
            this.accuracy = value.accuracy
        } else {
            this.accuracy = accuracy
        }
        if (this.accuracy === value.accuracy) {
            this.align = value.align
            return
        }
        this.align = 10n ** BigInt(accuracy)
        var shift = accuracy - value.accuracy
        if (shift < 0) {
            this.norm = this.norm / 10n ** BigInt(-shift)
        } else {
            this.norm = this.norm * 10n ** BigInt(shift)
        }
        return
    }
    var negative = false
    if (typeof value !== "string") {
        if (typeof value === "bigint") {
            this.accuracy = accuracy
            var multiplier = 10n ** BigInt(accuracy)
            this.norm = value * multiplier
            this.align = multiplier
            return
        }
        value = value.toString()
        var firstChar = value.charCodeAt(0)
        if (firstChar === 43) {
            value = value.slice(1)
        } else if (firstChar === 45) {
            value = value.slice(1)
            negative = true
        } else if (firstChar === 46) {
            value = "0" + value
        }
    }
    if (Big.isNaN(value)) {
        throw SyntaxError("Cannot convert " + (negative ? "-" : "") + value + " to a Big")
    }
    var len = value.length
    this.accuracy = accuracy
    this.align = 10n ** BigInt(accuracy)
    var dotIndex = -1
    for (var i = 0; i < len; i++) {
        if (value.charCodeAt(i) === 46) {
            dotIndex = i
            break
        }
    }
    var eIndex = -1
    for (var i = 0; i < len; i++) {
        if (value.charCodeAt(i) === 101) {
            eIndex = i
            break
        }
    }
    var pow10 = eIndex === -1 ? 0 : parseInt(value.slice(eIndex + 1, len))
    var round = !Big.ROUND_DOWN
    if (dotIndex === -1) {
        if (eIndex !== -1) {
            var temp = BigInt(value.slice(0, eIndex)) * this.align
            if (round) {
                temp = temp << 1n
            }
            this.norm = pow10 < 0 ? temp / 10n ** BigInt(-pow10) : pow10 === 0 ? temp : temp * 10n ** BigInt(pow10)
        } else {
            this.norm = (BigInt(value) * this.align) << 1n
        }
    } else {
        var multiplier = accuracy + pow10 - (eIndex === -1 ? len : eIndex) + dotIndex + 1
        if (multiplier > 320000000) {
            throw RangeError("Exponent value exceeds maximum limit.")
        } else if (multiplier < -320000000) {
            throw RangeError("Exponent value exceeds minimum limit.")
        }
        var temp = BigInt(value.slice(0, dotIndex) + value.slice(dotIndex + 1, eIndex === -1 ? len : eIndex))
        if (round) {
            temp = temp << 1n
        }
        this.norm = multiplier === 0 ? temp : multiplier > 0 ?
            temp * 10n ** BigInt(multiplier)
            : temp / 10n ** BigInt(-multiplier)
    }
    if (round) {
        var add = this.norm % 2n === 1n
        this.norm = this.norm >> 1n
        if (add) {
            this.norm++
        }
    }
    if (negative) {
        this.norm = -this.norm
    }
}

/**
 * Creates a Big instance that represents a finite number, with specified accuracy.
 * @param {string | number | bigint | Big} value The value to set the number to.
 * @param {Number} accuracy The accuracy of the number, in digits.
 * @param {Boolean} strict If set to true, the function requires the 'new' keyword parameters cannot be null.
 */
function parseBig(value, accuracy, strict) {
    return new Big(value, accuracy, strict)
}

/**
 * Returns a pseudo-random number between 0 and 1, allowing specified accuracy
 * @param {Number} accuracy The accuracy of the new randomized number, in digits.
 */
Big.random = function (accuracy = Big.ACCURACY) {
    if (isNaN(accuracy)) {
        throw RangeError("The accuracy of " + accuracy + " cannot be used because it is not a finite value.")
    } else if (accuracy < 1) {
        throw RangeError("The accuracy of " + accuracy + " is out of range.")
    } else if (accuracy > 320000000) {
        throw RangeError("Maximum Big size exceeded")
    }
    var value = new Big(null, accuracy)
    var arraySize = Math.ceil(accuracy * 0.103810252966) + 2
    var number = 0n
    var array
    if (arraySize > 16384) {
        array = new Uint32Array(16384)
        var sections = Math.floor(arraySize / 16384)
        for (var i = 0; i < sections; i++) {
            crypto.getRandomValues(array)
            for (var t = 0; t < 16384; t++) {
                number = (number << 32n) + BigInt(array[t])
            }
        }
        var lastSize = arraySize - sections * 16384
        if (lastSize !== 0) {
            array = new Uint32Array(lastSize)
            crypto.getRandomValues(array)
            for (i = 0; i < lastSize; i++) {
                number = (number << 32n) + BigInt(array[i])
            }
        }
    } else {
        array = new Uint32Array(arraySize)
        crypto.getRandomValues(array)
        for (var i = 0; i < arraySize; i++) {
            number = (number << 32n) + BigInt(array[i])
        }
    }
    value.norm = number % value.align
    return value
}

/**
 * Returns a pseudo-random number between 0 and 1, with the accuracy of the current Big instance.
 */
Big.prototype.random = function () {
    var accuracy = this.accuracy
    if (isNaN(accuracy)) {
        throw RangeError("The accuracy of " + accuracy + " cannot be used because it is not a finite value.")
    } else if (accuracy < 1) {
        throw RangeError("The accuracy of " + accuracy + " is out of range.")
    } else if (accuracy > 320000000) {
        throw RangeError("Maximum Big size exceeded")
    }
    var value = new Big(null, accuracy)
    var arraySize = Math.ceil(accuracy * 0.664385618978) + 2
    var number = 0n
    var array
    if (arraySize > 16384) {
        array = new Uint32Array(16384)
        var sections = Math.floor(arraySize / 16384)
        for (var i = 0; i < sections; i++) {
            crypto.getRandomValues(array)
            for (var i = 0; i < 16384; i++) {
                number = (number << 8n) + BigInt(array[i])
            }
        }
        var lastSize = arraySize - sections * 16384
        if (lastSize !== 0) {
            array = new Uint32Array(lastSize)
            crypto.getRandomValues(array)
            for (var i = 0; i < 16384; i++) {
                number = (number << 8n) + BigInt(array[i])
            }
        }
    } else {
        array = new Uint32Array(arraySize)
        crypto.getRandomValues(array)
        for (var i = 0; i < arraySize; i++) {
            number = (number << 8n) + BigInt(array[i])
        }
    }
    value.norm = number
    return value
}

/**
 * Adds two numbers together.
 * @param {string | number | bigint | Big} value The value that is added to the current number.
 */
Big.prototype.add = function (value) {
    var newVal = new Big(value, this.accuracy)
    newVal.norm = newVal.norm + this.norm
    return newVal
}
/**
 * Adds two numbers together.
 * @param {string | number | bigint | Big} value The value that is added to the current number.
 */
Big.prototype.sum = Big.prototype.add
/**
 * Adds two numbers together.
 * @param {string | number | bigint | Big} value The value that is added to the current number.
 */
Big.prototype.plus = Big.prototype.add

/**
 * Subtracts on number from another.
 * @param {string | number | bigint | Big} value The value that is subtracted from the current number.
 */
Big.prototype.sub = function (value) {
    var newVal = new Big(value, this.accuracy)
    if (typeof newVal === "undefined") {
        newVal.norm = -newVal.norm
    } else {
        newVal.norm = this.norm - newVal.norm
    }
    return newVal
}
/**
 * Subtracts one number from another.
 * @param {string | number | bigint | Big} value The value that is subtracted from the current number.
 */
Big.prototype.minus = Big.prototype.sub
/**
 * Subtracts one number from another.
 * @param {string | number | bigint | Big} value The value that is subtracted from the current number.
 */
Big.prototype.subtract = Big.prototype.sub

/**
 * Multiplies two numbers together.
 * @param {string | number | bigint | Big} value The value that is multiplied by the current number.
 */
Big.prototype.mul = function (value) {
    var newVal = new Big(value, this.accuracy)
    newVal.norm = this.norm * newVal.norm / newVal.align
    return newVal
}
/**
 * Multiplies two numbers together.
 * @param {string | number | bigint | Big} value The value that is multiplied by the current number.
 */
Big.prototype.times = Big.prototype.mul
/**
 * Multiplies two numbers together.
 * @param {string | number | bigint | Big} value The value that is multiplied by the current number.
 */
Big.prototype.multiply = Big.prototype.mul

/**
 * Divides one number from another.
 * @param {string | number | bigint | Big} value The value that divides the current number.
 */
Big.prototype.div = function (value) {
    if (value.norm === 0n) {
        throw RangeError("Division by zero")
    }
    var newVal = new Big(value, this.accuracy)
    newVal.norm = this.norm * this.align / newVal.norm
    return newVal
}
/**
 * Divides one number from another.
 * @param {string | number | bigint | Big} value The value that divides the current number.
 */
Big.prototype.divide = Big.prototype.div
 /**
  * Divides one number from another.
  * @param {string | number | bigint | Big} value The value that divides the current number.
  */Big.prototype.division = Big.prototype.div

/**
 * Returns the reciprical of the current number.
 */
Big.prototype.recip = function () {
    if (this.norm === 0n) {
        throw RangeError("Division by zero")
    }
    var value = new Big(this)
    value.norm = value.align * value.align / value.norm
    return value
}
/**
 * Returns the reciprical of the current number.
 */
Big.prototype.reciprical = Big.prototype.recip

/**
 * Returns the square of the current number.
 */
Big.prototype.sqr = function () {
    var value = new Big(this)
    value.norm = value.norm * value.norm / value.align
    return value
}
/**
 * Returns the square of the current number.
 */
Big.prototype.square = Big.prototype.sqr

/**
 * Returns the 3rd power of the current number.
 */
Big.prototype.cube = function () {
    var value = new Big(this)
    value.norm = value.norm * value.norm * value.norm / (value.align * value.align)
    return value
}

/**
 * Returns the negative of the current number.
 */
Big.prototype.neg = function () {
    var value = new Big(this)
    value.norm = -value.norm
    return value
}
/**
 * Returns the negative of the current number.
 */
Big.prototype.negative = Big.prototype.neg

/**
 * Returns the absolute value of the current number. For example, -5 and 5 both return 5.
 */
Big.prototype.abs = function () {
    var value = new Big(this)
    var norm = value.norm
    if (norm < 0) {
        value.norm = -norm
    }
    return value
}
/**
 * Returns the absolute value of the current number. For example, -5 and 5 both return 5.
 */
Big.prototype.absolute = Big.prototype.abs
/**
 * Returns the absolute value of the current number. For example, -5 and 5 both return 5.
 */
Big.prototype.absoluteValue = Big.prototype.abs

/**
 * Returns the negative of the absolute value of the current number. For example, -5 and 5 both return -5.
 */
Big.prototype.nbs = function () {
    var value = new Big(this)
    var norm = value.norm
    if (norm > 0) {
        value.norm = -norm
    }
    return value
}
/**
 * Returns the negative of the absolute value of the current number. For example, -5 and 5 both return -5.
 */
Big.prototype.nabs = Big.prototype.nbs
/**
* Returns the negative of the absolute value of the current number. For example, -5 and 5 both return -5.
*/
Big.prototype.negAbs = Big.prototype.nbs
/**
 * Returns the negative of the absolute value of the current number. For example, -5 and 5 both return -5.
 */
Big.prototype.negativeAbsolute = Big.prototype.nbs
/**
* Returns the negative of the absolute value of the current number. For example, -5 and 5 both return -5.
*/
Big.prototype.negativeOfAbsoluteValue = Big.prototype.nbs

/**
 * Returns the greatest integer less than or equal to the current number.
 */
Big.prototype.floor = function () {
    var value = new Big(this)
    value.norm -= value.norm % value.align
    return value
}
/**
 * Returns the greatest integer less than or equal to the current number.
 */
Big.prototype.roundDown = Big.prototype.floor

/**
* Returns the nearest integer to the current value.
*/
Big.prototype.round = function () {
    var value = new Big(this)
    if (value.norm % value.align < value.align >> 1n) {
        value.norm -= value.norm % value.align
    } else {
        value.norm += value.align - (value.norm % value.align)
    }
    return value
}

/**
 * Returns the smallest integer greater than or equal to the current number.
 */
Big.prototype.ceil = function () {
    var value = new Big(this)
    value.norm += value.align - (value.norm % value.align)
    return value
}

/**
 * Returns the greatest number divisible by the provided value less than or equal to the current number.
 * @param {string | number | bigint | Big} value The size of the interval.
 */
Big.prototype.floor2 = function (value = "1") {
    if (value === "1") {
        return this.floor()
    }
    var newVal = new Big(value, this.accuracy)
    if (newVal.norm === 0n) {
        throw RangeError("Division by zero")
    }
    newVal.norm = this.norm - (this.norm % newVal.norm)
    return newVal
}
/**
 * Returns the greatest number divisible by the provided value less than or equal to the current number.
 * @param {string | number | bigint | Big} value The size of the interval.
*/
Big.prototype.intervalDown = Big.prototype.floor2

/**
 * Returns the number divisible by the specified value that is closest to the current number.
 * @param {string | number | bigint | Big} value The size of the interval.
 */
Big.prototype.round2 = function (value = "1") {
    if (value === "1") {
        return this.round()
    }
    var newVal = new Big(value, this.accuracy)
    if (newVal.norm === 0n) {
        throw RangeError("Division by zero")
    }
    if (this.norm % newVal.norm < newVal.norm >> 1n) {
        newVal.norm = this.norm - (this.norm % newVal.norm)
    } else {
        newVal.norm = this.norm + newVal.norm - (this.norm % newVal.norm)
    }
    return newVal
}
/**
 * Returns the number divisible by the specified value that is closest to the current number.
 * @param {string | number | bigint | Big} value The size of the interval.
 */
Big.prototype.interval = Big.prototype.floor2
/**
 * Returns the number divisible by the specified value that is closest to the current number.
 * @param {string | number | bigint | Big} value The size of the interval.
 */
Big.prototype.intervalRound = Big.prototype.floor2

/**
 * Returns the smallest number divisible by the provided value greater than or equal to the current number.
 * @param {string | number | bigint | Big} value The size of the interval.
 */
Big.prototype.ceil2 = function (value = "1") {
    if (value === "1") {
        return this.ceil()
    }
    var newVal = new Big(value, this.accuracy)
    if (newVal.norm === 0n) {
        throw RangeError("Division by zero")
    }
    newVal.norm = this.norm + newVal.norm - (this.norm % newVal.norm)
    return newVal
}
/**
 * Returns the smallest number divisible by the provided value greater than or equal to the current number.
 * @param {string | number | bigint | Big} value The size of the interval.
 */
Big.prototype.intervalUp = Big.prototype.ceil2

/**
 * Returns the remainder when the current number is divided by the provided value.
 * @param {string | number | bigint | Big} value The value the current number will receieve a modulo operation on.
 */
Big.prototype.mod = function (value) {
    var newVal = new Big(value, this.accuracy)
    if (value.norm === 0n) {
        throw RangeError("Division by zero")
    }
    newVal.norm = this.norm % newVal.norm
    return newVal
}
/**
 * Returns the remainder when the current number is divided by the provided value.
 * @param {string | number | bigint | Big} value The value the current number will receieve a modulo operation on.
 */
Big.prototype.modulo = Big.prototype.mod
/**
 * Returns the remainder when the current number is divided by the provided value.
 * @param {string | number | bigint | Big} value The value the current number will receieve a modulo operation on.
 */
Big.prototype.remainder = Big.prototype.mod

/**
 * Returns the square root of the current number.
 */
Big.prototype.sqrt = function () {
    if (this.norm < 0n) {
        throw RangeError("Square root cannot be operated on a negative value")
    } else if (this.norm === 0n) {
        return new Big(null, this.accuracy)
    }
    var value = new Big(this)
    var number = value.norm * value.align
    if (number === 10n) {
        value.norm = 3n
        return value
    }
    var a
    if (number < 9007199254740991n) {
        value.norm = BigInt(Math.floor(Math.sqrt(Number(number))))
        return value
    } else if (number < 4503599627370496n) {
        a = BigInt(Math.floor(Math.sqrt(Number(number))) - 3)
    } else {
        a = 4503599627370494n
    }

    var b = -1n
    while ((a !== b && a !== b + 1n)) {
        b = a
        a = ((number / b) + b) >> 1n
    }
    value.norm = b
    return value
}
/**
 * Returns the square root of the current number.
 */
Big.prototype.squareRoot = Big.prototype.sqrt

/**
 * Returns the current number, multiplied by two to the power of the bits specified.
 * @param {number} value The amount of bits to shift.
 */
Big.prototype.shift = function (bits) {
    bits = Number(bits)
    if (!Number.isInteger(bits)) {
        throw RangeError("The shift of " + bits + " bits cannot be used because it is not an integer.")
    } else if (bits > 1000000000) {
        throw RangeError("The shift of " + bits + " bits cannot be used because it exceeds 1000000000.")
    }
    var value = new Big(this)
    if (bits === 0) {
        return value
    }
    value.norm = value.norm << BigInt(bits)
    return value
}
/**
 * Returns the current number, multiplied by two to the power of the bits specified.
 * @param {number} value The amount of bits to shift.
 */
Big.prototype.shiftBits = Big.prototype.shift

/**
 * Returns the smaller of the current number and the specified value.
 * @param {number} value The other value that will be returned if it is less than the current number.
 */
Big.prototype.min = function (value) {
    if (this.norm < value.norm) {
        return new Big(value)
    }
    return new Big(this)
}
/**
 * Returns the smaller of the current number and the specified value.
 * @param {number} value The other value that will be returned if it is less than the current number.
 */
Big.prototype.minimum = Big.prototype.min

/**
 * Returns the greater of the current number and the specified value.
 * @param {number} value The other value that will be returned if it is greater than the current number.
 */
Big.prototype.max = function (value) {
    if (this.norm > value.norm) {
        return new Big(value)
    }
    return new Big(this)
}
/**
 * Returns the greater of the current number and the specified value.
 * @param {number} value The other value that will be returned if it is greater than the current number.
 */
Big.prototype.maximum = Big.prototype.max

/**
 * Returns the smallest of the current number and a set of values.
 * @param {string | number | bigint | Big} values Returns the smallest of these values if the smallest value is less than the current number.
 */
Big.prototype.min2 = function (...values) {
    var value = new Big(this)
    for (var i = 0; i < values.length; i++) {
        var newVal = new Big(values[i], this.accuracy)
        if (newVal.norm < value) {
            value = newVal
        }
    }
    return value
}
/**
 * Returns the smallest of the current number and a set of values.
 * @param {string | number | bigint | Big} values Returns the smallest of these values if the smallest value is less than the current number.
 */
Big.prototype.multiMin = Big.prototype.min2
/**
 * Returns the smallest of the current number and a set of values.
 * @param {string | number | bigint | Big} values Returns the smallest of these values if the smallest value is less than the current number.
 */
Big.prototype.multipleMinimums = Big.prototype.min2

/**
 * Returns the greatest of the current number and a set of values.
 * @param {string | number | bigint | Big} values Returns the greatest of these values if the greatest value is less than the current number.
 */
Big.prototype.max2 = function (...values) {
    var value = new Big(this)
    for (var i = 0; i < values.length; i++) {
        var newVal = new Big(values[i], this.accuracy)
        if (newVal.norm > value) {
            value = newVal
        }
    }
    return value
}
/**
 * Returns the greatest of the current number and a set of values.
 * @param {string | number | bigint | Big} values Returns the greatest of these values if the greatest value is less than the current number.
 */
Big.prototype.multiMax = Big.prototype.max2
/**
 * Returns the greatest of the current number and a set of values.
 * @param {string | number | bigint | Big} values Returns the greatest of these values if the greatest value is less than the current number.
 */
Big.prototype.multipleMaximums = Big.prototype.max2

/**
 * Returns true if the current number is less than the specified value, otherwise returns false.
 * @param {string | number | bigint | Big} value The value that will be compared to the current number.
 */
Big.prototype.lt = function (value) {
    return this.norm < new Big(value, this.accuracy).norm
}
/**
 * Returns true if the current number is less than the specified value, otherwise returns false.
 * @param {string | number | bigint | Big} value The value that will be compared to the current number.
 */
Big.prototype.less = Big.prototype.lt
/**
 * Returns true if the current number is less than the specified value, otherwise returns false.
 * @param {string | number | bigint | Big} value The value that will be compared to the current number.
 */
Big.prototype.lessThan = Big.prototype.lt

/**
 * Returns true if the current number is greater than the specified value, otherwise returns false.
 * @param {string | number | bigint | Big} value The value that will be compared to the current number.
 */
Big.prototype.gt = function (value) {
    return this.norm > new Big(value, this.accuracy).norm
}
/**
 * Returns true if the current number is greater than the specified value, otherwise returns false.
 * @param {string | number | bigint | Big} value The value that will be compared to the current number.
 */
Big.prototype.more = Big.prototype.gt
/**
 * Returns true if the current number is greater than the specified value, otherwise returns false.
 * @param {string | number | bigint | Big} value The value that will be compared to the current number.
 */
Big.prototype.greater = Big.prototype.gt
/**
 * Returns true if the current number is greater than the specified value, otherwise returns false.
 * @param {string | number | bigint | Big} value The value that will be compared to the current number.
 */
Big.prototype.greaterThan = Big.prototype.gt

/**
 * Returns true if the current number is less than or equal to the specified value, otherwise returns false.
 * @param {string | number | bigint | Big} value The value that will be compared to the current number.
 */
Big.prototype.lte = function (value) {
    return this.norm <= new Big(value, this.accuracy).norm
}
/**
 * Returns true if the current number is less than or equal to the specified value, otherwise returns false.
 * @param {string | number | bigint | Big} value The value that will be compared to the current number.
 */
Big.prototype.lessEq = Big.prototype.lte
/**
 * Returns true if the current number is less than or equal to the specified value, otherwise returns false.
 * @param {string | number | bigint | Big} value The value that will be compared to the current number.
 */
Big.prototype.lessOrEqual = Big.prototype.lte
/**
 * Returns true if the current number is less than or equal to the specified value, otherwise returns false.
 * @param {string | number | bigint | Big} value The value that will be compared to the current number.
 */
Big.prototype.LessThanOrEqualTo = Big.prototype.lte

/**
 * Returns true if the current number is greater than or equal to the specified value, otherwise returns false.
 * @param {string | number | bigint | Big} value The value that will be compared to the current number.
 */
Big.prototype.gte = function (value) {
    return this.norm >= new Big(value, this.accuracy).norm
}
/**
 * Returns true if the current number is greater than or equal to the specified value, otherwise returns false.
 * @param {string | number | bigint | Big} value The value that will be compared to the current number.
 */
Big.prototype.moreEq = Big.prototype.gte
/**
 * Returns true if the current number is greater than or equal to the specified value, otherwise returns false.
 * @param {string | number | bigint | Big} value The value that will be compared to the current number.
 */
Big.prototype.moreOrEqual = Big.prototype.gte
/**
 * Returns true if the current number is greater than or equal to the specified value, otherwise returns false.
 * @param {string | number | bigint | Big} value The value that will be compared to the current number.
 */
Big.prototype.greaterOrEqual = Big.prototype.gte
/**
 * Returns true if the current number is greater than or equal to the specified value, otherwise returns false.
 * @param {string | number | bigint | Big} value The value that will be compared to the current number.
 */
Big.prototype.GreaterThanOrEqualTo = Big.prototype.gte

/**
 * Returns true if the current number is equal to the specified value, otherwise returns false.
 * @param {string | number | bigint | Big} value The value that will be compared to the current number.
 */
Big.prototype.eq = function (value) {
    return this.norm === new Big(value, this.accuracy).norm
}
/**
 * Returns true if the current number is equal to the specified value, otherwise returns false.
 * @param {string | number | bigint | Big} value The value that will be compared to the current number.
 */
Big.prototype.equals = Big.prototype.eq


/**
 * Returns true if the current number is not equal to the specified value, otherwise returns false.
 * @param {string | number | bigint | Big} value The value that will be compared to the current number.
 */
Big.prototype.neq = function (value) {
    return this.norm !== new Big(value, this.accuracy).norm
}
/**
 * Returns true if the current number is not equal to the specified value, otherwise returns false.
 * @param {string | number | bigint | Big} value The value that will be compared to the current number.
 */
Big.prototype.notEqual = Big.prototype.neq
/**
 * Returns true if the current number is not equal to the specified value, otherwise returns false.
 * @param {string | number | bigint | Big} value The value that will be compared to the current number.
 */
Big.prototype.notEqualTo = Big.prototype.eq

/**
 * If the current number is between the minimum and maximum, return the current number. If the current number is less than min, return min. If the value is greater than max, return max
 * @param {string | number | bigint | Big} min The minimum value that will be returned.
 * @param {string | number | bigint | Big} max The maximum value that will be returned.
 */
Big.prototype.range = function (min, max) {
    var value = new Big(this)
    min = new Big(min, value.accuracy)
    max = new Big(max, value.accuracy)
    var norm = value.norm
    var tempNorm = max.norm
    if (norm > tempNorm) {
        value.norm = tempNorm
        return value
    }
    var tempNorm = min.norm
    if (norm < tempNorm) {
        value.norm = tempNorm
    }
    return value
}

/**
 * Returns the current number, but the accuracy is equal to the the specified (or default) amount of digits.
 * @param {number} digits The accuracy of the new number.
 */
Big.prototype.acc = function (digits = Big.ACCURACY) {
    digits = Math.ceil(Number(digits))
    if (isNaN(digits)) {
        throw RangeError("The accuracy of " + digits + " cannot used because it is not a finite value.")
    } else if (digits < 1) {
        throw RangeError("The accuracy of " + digits + " is out of range.")
    } else if (digits > 320000000) {
        throw RangeError("Maximum Big size exceeded")
    }
    var value = new Big(this)
    var acc = value.accuracy
    if (acc === digits) {
        return value
    }
    var shift = digits - acc
    value.accuracy = digits
    value.align = 10n ** BigInt(digits)
    if (shift < 0) {
        value.norm = value.norm / 10n ** BigInt(-shift)
    } else {
        value.norm = value.norm * 10n ** BigInt(shift)
    }
    return value
}
/**
 * Returns the current number, but the accuracy is equal to the the specified (or default) amount of digits.
 * @param {number} digits The accuracy for the new number.
 */
Big.prototype.setAcc = Big.prototype.acc
/**
 * Returns the current number, but the accuracy is equal to the the specified (or default) amount of digits.
 * @param {number} digits The accuracy for the new number.
 */
Big.prototype.setAccuracy = Big.prototype.acc

/**
 * If the current number is an integer, return true. Otherwise, return false.
 */
Big.prototype.isInt = function () {
    return this.norm % this.align === 0n
}
/**
 * If the current number is an integer, return true. Otherwise, return false.
 */
Big.prototype.isInteger = Big.prototype.isInt

/**
 * If the current number is divisible by divisor (there is a remainder of 0), return true. Otherwise, return false.
 */
Big.prototype.isDiv = function (divisior) {
    return this.norm % new Big(divisior, this.accuracy).norm === 0n
}
/**
 * If the current number is divisible by divisor (there is a remainder of 0), return true. Otherwise, return false.
 */
Big.prototype.isDivisibleBy = Big.prototype.isDiv

/**
 * If the current value is positive, return true. Otherwise, return false.
 */
Big.prototype.isPos = function () {
    return this.norm > 0n
}
/**
 * If the current value is positive, return true. Otherwise, return false.
 */
Big.prototype.isPositive = Big.prototype.isPos

/**
 * If the current value is negative, return true. Otherwise, return false.
 */
Big.prototype.isNeg = function () {
    return this.norm < 0n
}
/**
 * If the current value is negative, return true. Otherwise, return false.
 */
Big.prototype.isNegative = Big.prototype.isNeg

/**
 * If the current value is nonnegative (positive or zero), return true. Otherwise, return false.
 */
Big.prototype.isNonNeg = function () {
    return this.norm >= 0n
}
/**
 * If the current value is nonnegative (positive or zero), return true. Otherwise, return false.
 */
Big.prototype.isNonNegative = Big.prototype.isNonNeg
/**
 * If the current value is nonnegative (positive or zero), return true. Otherwise, return false.
 */
Big.prototype.isPositiveOrZero = Big.prototype.isNonNeg

/**
 * If the current value is nonpositive (negative or zero), return true. Otherwise, return false.
 */
Big.prototype.isNonPos = function () {
    return this.norm <= 0n
}
/**
 * If the current value is nonpositive (negative or zero), return true. Otherwise, return false.
 */
Big.prototype.isNonPositive = Big.prototype.isNonPos
/**
 * If the current value is nonpositive (negative or zero), return true. Otherwise, return false.
 */
Big.prototype.isNegativeOrZero = Big.prototype.isNonPos

/**
 * Returns the sign of the current value.
 * Negative values return -1.
 * Positive values return 0.
 * A value that is 0 returns 0.
 */
Big.prototype.sign = function () {
    return this.norm > 0n ? new Big("1", this.accuacy) : this.norm < 0n ? new Big("-1", this.accuacy) : new Big("0", this.accuacy)
}

/**
 * If the current value is equal to zero, return true. Otherwise, return false.
 */
Big.prototype.isZero = function () {
    return this.norm === 0n
}
/**
 * If the current value is equal to zero, return true. Otherwise, return false.
 */
Big.prototype.isEqualToZero = Big.prototype.isZero

/**
 * If the current value is equal to one, return true. Otherwise, return false.
 */
Big.prototype.isOne = function () {
    return this.norm === this.align
}
/**
 * If the current value is equal to one, return true. Otherwise, return false.
 */
Big.prototype.isEqualToOne = Big.prototype.isOne

/**
 * Returns a Boolean value that indicates if a string will throw an error when passed into Big() when strict mode is off.
 * @param {string} number The string to test.
*/
Big.isNaN = function (number) {
    if (number == null) {
        return false
    } if (typeof number === "number") {
        return !isFinite(number)
    } else if (typeof number === "bigint") {
        return false
    }
    if (number instanceof Big) {
        return false
    }
    string = number.toString()
    if (string === ".") {
        return true
    }
    var strLen = string.length
    var first = string.charCodeAt(0)
    if (first === 43 || first === 45) {
        string = string.slice(1)
        strLen--
    }
    var eIndex = strLen
    for (var i = 0; i < strLen; i++) {
        if (string.charCodeAt(i) === 101) {
            eIndex = i
            break
        }
    }
    var metDot = false
    for (i = 0; i < eIndex; i++) {
        var charCode = string.charCodeAt(i)
        if (charCode > 47 && charCode < 58) {
            continue
        } else if (charCode === 46) {
            if (!metDot) {
                metDot = true
                continue
            }
        }
        return true
    }
    if (eIndex !== strLen) {
        if (eIndex === strLen - 1 || eIndex === 0) {
            return true
        }
        var part = string.slice(eIndex + 1, strLen)
        if (part === ".") {
            return true
        }
        first = part.charCodeAt(0)
        if (first === 43 || first === 45) {
            part = part.slice(1)
            strLen--
        }
        for (i = 0; i < part.length; i++) {
            var charCode = part.charCodeAt(i)
            if (charCode > 47 && charCode < 58) {
                continue
            }
            return true
        }
    }
    return false
}
/**
 * Returns a Boolean value that indicates if a string will throw an error when passed into Big() when strict mode is off.
 * @param {string} number The string to test.
*/
Big.prototype.isNotANumber = Big.prototype.isNaN

/**
 * Returns a Boolean value that indicates if a string will not throw an error when passed into Big() when strict mode is off.
 * @param {string} number The string to test.
*/
Big.isValid = function (number) {
    return !Big.isNaN(number)
}

/**
 * Returns a Boolean value that indicates if the value is a Big instance.
 * @param {any} number The number to test.
*/
Big.isBig = function (number) {
    return number instanceof Big
}

/**
 * Returns a string representation of the current number.
*/
Big.prototype.toString = function () {
    if (this.norm === 0n) {
        return "0"
    }
    var negative = this.norm < 0n
    var pos = negative ? -this.norm : this.norm
    var str = pos.toString()
    var len = str.length
    if (len <= this.accuracy) {
        for (var i = len - 1; i !== -1; i--) {
            if (str.charCodeAt(i) !== 48) {
                str = str.slice(0, i + 1)
                break
            }
        }
        return (negative ? "-0." : "0.") + ("0".repeat(this.accuracy - len)) + str
    }
    var negSlice = len - this.accuracy
    var slice = null
    var mod1 = str.slice(negSlice)
    for (var i = mod1.length - 1; i !== -1; i--) {
        if (mod1.charCodeAt(i) !== 48) {
            slice = i + 1
            break
        }
    }
    var integer = str.slice(0, negSlice)
    if (slice === null) {
        return (negative ? "-" : "") + integer
    }
    return (negative ? "-" : "") + integer + "." + mod1.slice(0, slice)
}

/**
 * Returns a string representing a number in fixed-point notation. Appends extra zeros if needed.
 * @param {number} digits The number of digits to use.
*/
Big.prototype.toFixed = function (digits = 0) {
    digits = parseInt(digits)
    if (isNaN(digits)) {
        digits = 0
    } else if (digits < 0) {
        throw RangeError("toFixed() digits argument must be nonnegative")
    }
    if (this.norm === 0n) {
        if (digits === 0) {
            return "0"
        }
        return "0." + ("0".repeat(digits))
    }
    var str = this.toString()
    var len = str.length
    var dotIndex = str.indexOf(".")
    if (digits === 0) {
        return str.slice(0, dotIndex)
    }
    var slice = dotIndex + digits + 1
    if (slice > len) {
        return str + "0".repeat(slice - len)
    }
    for (var i = len - 1; i !== -1; i--) {
        if (str.charCodeAt(i) !== 48) {
            str = str.slice(0, i + 1)
            break
        }
    }
    return str.slice(0, dotIndex + digits + 1)
}
Big.prototype.toFixedDigits = Big.prototype.toFixed

/**
 * Returns a string representing a number in fixed-point notation, but removes extra zeros.
 * @param {number} digits The maximum number of digits to use.
*/
Big.prototype.toDigits = function (digits = 0) {
    digits = parseInt(digits)
    if (isNaN(digits)) {
        digits = 0
    } else if (digits < 0) {
        throw RangeError("toDigits() digits argument must be nonnegative.")
    }
    if (this.norm === 0n) {
        return "0"
    }
    var str = this.toString()
    if (digits >= this.accuracy) {
        return str
    }
    var dotIndex = str.indexOf(".")
    if (digits === 0) {
        return str.slice(0, dotIndex)
    } else if (dotIndex === -1) {
        return str
    }
    str = str.slice(0, Math.min(str.length, dotIndex + digits + 1))
    for (var i = str.length - 1; i !== dotIndex; i--) {
        if (str.charCodeAt(i) !== 48) {
            return str.slice(0, i + 1)
        }
    }
    return str.slice(0, dotIndex)
}

Big.prototype.toMaxDigits = Big.prototype.toMaxDigits
Big.prototype.toMaximumDigits = Big.prototype.toMaxDigits

// Useful for hiding accuracy loss (take Big(19).recip().recip())
// Equivalent to running toDigits(accuracy - digits), where accuracy is the accuracy (in digits) of the current number
Big.prototype.clearDigits = function (digits = 0) {
    return this.toDigits(this.accuracy - parseInt(digits))
}
