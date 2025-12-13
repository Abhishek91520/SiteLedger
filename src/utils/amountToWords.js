/**
 * Convert amount to Indian English words
 * Supports: Crores, Lakhs, Thousands
 * Example: 17835660 -> "Rupees One Crore Seventy Eight Lakh Thirty Five Thousand Six Hundred Sixty Only"
 */

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function convertLessThanThousand(num) {
  if (num === 0) return ''
  
  let result = ''
  
  // Hundreds place
  if (num >= 100) {
    result += ones[Math.floor(num / 100)] + ' Hundred '
    num %= 100
  }
  
  // Tens and ones place
  if (num >= 20) {
    result += tens[Math.floor(num / 10)] + ' '
    num %= 10
  } else if (num >= 10) {
    result += teens[num - 10] + ' '
    num = 0
  }
  
  // Ones place
  if (num > 0) {
    result += ones[num] + ' '
  }
  
  return result.trim()
}

export function amountToWords(amount) {
  // Handle zero
  if (amount === 0 || amount === '0') {
    return 'Zero Rupees Only'
  }
  
  // Convert to number and round to 2 decimal places
  const num = Math.round(parseFloat(amount) * 100) / 100
  
  // Separate rupees and paise
  const rupees = Math.floor(num)
  const paise = Math.round((num - rupees) * 100)
  
  let words = ''
  
  // Indian numbering system: Crores, Lakhs, Thousands
  
  // Crores (10,000,000)
  if (rupees >= 10000000) {
    const crores = Math.floor(rupees / 10000000)
    words += convertLessThanThousand(crores) + ' Crore '
  }
  
  // Lakhs (100,000)
  const lakhs = Math.floor((rupees % 10000000) / 100000)
  if (lakhs > 0) {
    words += convertLessThanThousand(lakhs) + ' Lakh '
  }
  
  // Thousands (1,000)
  const thousands = Math.floor((rupees % 100000) / 1000)
  if (thousands > 0) {
    words += convertLessThanThousand(thousands) + ' Thousand '
  }
  
  // Hundreds, tens, ones
  const remainder = rupees % 1000
  if (remainder > 0) {
    words += convertLessThanThousand(remainder)
  }
  
  // Add "Rupees"
  words = words.trim()
  if (words) {
    words = 'Rupees ' + words
  }
  
  // Add paise if present
  if (paise > 0) {
    if (words) {
      words += ' and '
    }
    words += convertLessThanThousand(paise) + ' Paise'
  }
  
  // Add "Only" at the end
  words += ' Only'
  
  return words
}

// Shorthand for currency formatting
export function formatCurrency(amount) {
  return '₹' + parseFloat(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// Example usage:
// amountToWords(17835660) -> "Rupees One Crore Seventy Eight Lakh Thirty Five Thousand Six Hundred Sixty Only"
// amountToWords(1234.50) -> "Rupees One Thousand Two Hundred Thirty Four and Fifty Paise Only"
// amountToWords(50000) -> "Rupees Fifty Thousand Only"
