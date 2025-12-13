/**
 * Format number in Indian currency style (Lakhs/Crores)
 * Example: 17835660 -> ₹1,78,35,660.00
 */
export function formatIndianCurrency(amount) {
  if (amount === null || amount === undefined) return '₹0.00'
  
  const isNegative = amount < 0
  const absoluteAmount = Math.abs(amount)
  
  // Format to 2 decimal places
  const formatted = absoluteAmount.toFixed(2)
  const [integerPart, decimalPart] = formatted.split('.')
  
  // Indian number formatting
  let lastThree = integerPart.substring(integerPart.length - 3)
  const otherNumbers = integerPart.substring(0, integerPart.length - 3)
  
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree
  }
  
  const result = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree
  
  return `${isNegative ? '-' : ''}₹${result}.${decimalPart}`
}

/**
 * Convert number to Indian English words
 * Example: 17835660 -> "Rupees One Crore Seventy Eight Lakh Thirty Five Thousand Six Hundred Sixty Only"
 */
export function amountToWords(amount) {
  if (amount === null || amount === undefined || amount === 0) {
    return 'Zero Rupees Only'
  }

  const isNegative = amount < 0
  const absoluteAmount = Math.abs(amount)
  
  // Split into integer and decimal parts
  const [integerPart, decimalPart] = absoluteAmount.toFixed(2).split('.')
  const num = parseInt(integerPart, 10)
  const paise = parseInt(decimalPart, 10)

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function convertTwoDigits(n) {
    if (n === 0) return ''
    if (n < 10) return ones[n]
    if (n < 20) return teens[n - 10]
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '')
  }

  function convertThreeDigits(n) {
    if (n === 0) return ''
    let result = ''
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred'
      n %= 100
      if (n > 0) result += ' '
    }
    if (n > 0) {
      result += convertTwoDigits(n)
    }
    return result
  }

  let words = ''

  // Crores
  if (num >= 10000000) {
    words += convertTwoDigits(Math.floor(num / 10000000)) + ' Crore '
    // Handle the case where we have exactly X crores
    if (num % 10000000 === 0) {
      words = words.trim()
    }
  }

  // Lakhs
  const lakhs = Math.floor((num % 10000000) / 100000)
  if (lakhs > 0) {
    words += convertTwoDigits(lakhs) + ' Lakh '
  }

  // Thousands
  const thousands = Math.floor((num % 100000) / 1000)
  if (thousands > 0) {
    words += convertTwoDigits(thousands) + ' Thousand '
  }

  // Hundreds, Tens, and Ones
  const remainder = num % 1000
  if (remainder > 0) {
    words += convertThreeDigits(remainder)
  }

  words = words.trim()

  let result = (isNegative ? 'Minus ' : '') + 'Rupees ' + (words || 'Zero')

  // Add paise if exists
  if (paise > 0) {
    result += ' and ' + convertTwoDigits(paise) + ' Paise'
  }

  result += ' Only'

  return result
}

/**
 * Calculate percentage
 */
export function calculatePercentage(completed, total) {
  if (!total || total === 0) return 0
  return Math.round((completed / total) * 100 * 100) / 100 // 2 decimal places
}

/**
 * Format percentage for display
 */
export function formatPercentage(percentage) {
  return `${percentage.toFixed(2)}%`
}
