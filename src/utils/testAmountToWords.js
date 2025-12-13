/**
 * Test Amount to Words Converter
 * Run: node src/utils/testAmountToWords.js
 */

import { amountToWords } from './amountToWords.js'

// Test cases
const testCases = [
  0,
  1,
  10,
  100,
  1000,
  10000,
  50000,
  100000, // 1 Lakh
  500000, // 5 Lakhs
  1000000, // 10 Lakhs
  10000000, // 1 Crore
  17835660, // Actual project amount
  1234.50,
  999999999
]

console.log('='.repeat(80))
console.log('AMOUNT TO WORDS CONVERTER - TEST CASES')
console.log('='.repeat(80))
console.log()

testCases.forEach(amount => {
  const words = amountToWords(amount)
  const formatted = '₹' + amount.toLocaleString('en-IN', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  })
  
  console.log(`${formatted.padEnd(20)} => ${words}`)
  console.log('-'.repeat(80))
})

console.log()
console.log('✅ All test cases completed!')
