/**
 * AI Question Generator Utility
 * 
 * Handles the communication with Google Gemini API for dynamic question 
 * generation and maintains a robust category-specific fallback system.
 * 
 * @author Aptitude AI Team
 * @version 1.1.0
 */

require('dotenv').config();
const axios = require('axios');

// Category-specific fallback questions (20+ per category)
const fallbackQuestionBank = {
    'Number System': [
        { question: 'What is the sum of the first 10 natural numbers?', options: ['45', '50', '55', '60'], correctOptionIndex: 2, solution: 'Sum = n(n+1)/2 = 10×11/2 = 55', difficulty: 'easy', category: 'Number System' },
        { question: 'Find the unit digit of 7^25.', options: ['1', '3', '7', '9'], correctOptionIndex: 2, solution: 'Unit digits of powers of 7 cycle: 7,9,3,1. 25 mod 4 = 1, so unit digit is 7.', difficulty: 'medium', category: 'Number System' },
        { question: 'How many prime numbers are between 1 and 20?', options: ['6', '7', '8', '9'], correctOptionIndex: 2, solution: 'Primes: 2,3,5,7,11,13,17,19 = 8 primes', difficulty: 'easy', category: 'Number System' },
        { question: 'What is the remainder when 17^23 is divided by 16?', options: ['0', '1', '15', '17'], correctOptionIndex: 1, solution: '17 = 16+1, so 17^23 mod 16 = 1^23 = 1', difficulty: 'medium', category: 'Number System' },
        { question: 'Find the LCM of 12 and 18.', options: ['24', '36', '72', '108'], correctOptionIndex: 1, solution: 'LCM(12,18) = 36', difficulty: 'easy', category: 'Number System' },
        { question: 'The product of two numbers is 120 and their HCF is 6. Find their LCM.', options: ['15', '20', '30', '720'], correctOptionIndex: 1, solution: 'HCF × LCM = Product. LCM = 120/6 = 20', difficulty: 'medium', category: 'Number System' },
        { question: 'What is 25% of 80?', options: ['15', '20', '25', '30'], correctOptionIndex: 1, solution: '25% of 80 = 0.25 × 80 = 20', difficulty: 'easy', category: 'Number System' },
        { question: 'Find the smallest 4-digit number divisible by 12.', options: ['1000', '1008', '1012', '1020'], correctOptionIndex: 1, solution: '1000 ÷ 12 = 83.33. Next: 84 × 12 = 1008', difficulty: 'medium', category: 'Number System' },
        { question: 'What is the square root of 144?', options: ['10', '11', '12', '13'], correctOptionIndex: 2, solution: '√144 = 12', difficulty: 'easy', category: 'Number System' },
        { question: 'If a number is divisible by both 3 and 5, it must be divisible by:', options: ['8', '10', '15', '30'], correctOptionIndex: 2, solution: 'LCM of 3 and 5 is 15', difficulty: 'easy', category: 'Number System' },
        { question: 'Find the value of 2^8.', options: ['128', '256', '512', '1024'], correctOptionIndex: 1, solution: '2^8 = 256', difficulty: 'easy', category: 'Number System' },
        { question: 'How many factors does 36 have?', options: ['6', '7', '8', '9'], correctOptionIndex: 3, solution: '36 = 2² × 3². Factors = (2+1)(2+1) = 9', difficulty: 'medium', category: 'Number System' },
        { question: 'What is the cube of 5?', options: ['15', '25', '125', '625'], correctOptionIndex: 2, solution: '5³ = 125', difficulty: 'easy', category: 'Number System' },
        { question: 'Find the unit digit of 3^100.', options: ['1', '3', '7', '9'], correctOptionIndex: 0, solution: 'Powers of 3 cycle: 3,9,27,81. 100 mod 4 = 0, so unit digit is 1', difficulty: 'medium', category: 'Number System' },
        { question: 'What is the sum of first 20 even numbers?', options: ['380', '400', '420', '440'], correctOptionIndex: 2, solution: 'Sum = n(n+1) = 20×21 = 420', difficulty: 'medium', category: 'Number System' },
        { question: 'How many two-digit prime numbers are there?', options: ['21', '25', '30', '15'], correctOptionIndex: 0, solution: 'There are 21 two-digit primes from 11 to 97', difficulty: 'hard', category: 'Number System' },
        { question: 'Find the greatest 3-digit number divisible by 8.', options: ['992', '996', '998', '1000'], correctOptionIndex: 0, solution: '999 ÷ 8 = 124.875. 124 × 8 = 992', difficulty: 'easy', category: 'Number System' },
        { question: 'What is 15² - 14²?', options: ['27', '28', '29', '30'], correctOptionIndex: 2, solution: '15² - 14² = (15+14)(15-14) = 29', difficulty: 'easy', category: 'Number System' },
        { question: 'The sum of two numbers is 25 and their product is 144. Find the numbers.', options: ['9, 16', '8, 17', '12, 13', '10, 15'], correctOptionIndex: 0, solution: 'x + y = 25, xy = 144. Numbers are 9 and 16', difficulty: 'medium', category: 'Number System' },
        { question: 'Find the value of √(81 × 49).', options: ['56', '63', '72', '49'], correctOptionIndex: 1, solution: '√(81 × 49) = 9 × 7 = 63', difficulty: 'easy', category: 'Number System' },
        { question: 'What is the remainder when 123456 is divided by 9?', options: ['0', '3', '6', '9'], correctOptionIndex: 2, solution: 'Sum of digits = 1+2+3+4+5+6 = 21. 21 mod 9 = 3', difficulty: 'medium', category: 'Number System' },
        { question: 'How many digits are there in 2^10?', options: ['3', '4', '5', '6'], correctOptionIndex: 1, solution: '2^10 = 1024, which has 4 digits', difficulty: 'easy', category: 'Number System' }
    ],
    'HCF and LCM': [
        { question: 'Find the HCF of 48 and 60.', options: ['6', '12', '24', '4'], correctOptionIndex: 1, solution: 'HCF(48,60) = 12', difficulty: 'easy', category: 'HCF and LCM' },
        { question: 'Find the LCM of 15 and 20.', options: ['60', '100', '120', '300'], correctOptionIndex: 0, solution: 'LCM(15,20) = 60', difficulty: 'easy', category: 'HCF and LCM' },
        { question: 'The HCF of two numbers is 8 and their product is 384. Find their LCM.', options: ['24', '32', '48', '64'], correctOptionIndex: 2, solution: 'HCF × LCM = Product. LCM = 384/8 = 48', difficulty: 'medium', category: 'HCF and LCM' },
        { question: 'Find the HCF of 18, 24 and 36.', options: ['2', '3', '6', '12'], correctOptionIndex: 2, solution: 'HCF(18,24,36) = 6', difficulty: 'easy', category: 'HCF and LCM' },
        { question: 'Find the LCM of 4, 6 and 8.', options: ['12', '24', '48', '96'], correctOptionIndex: 1, solution: 'LCM(4,6,8) = 24', difficulty: 'easy', category: 'HCF and LCM' },
        { question: 'Two numbers are in ratio 3:4 with HCF 5. Find the numbers.', options: ['15 and 20', '9 and 12', '6 and 8', '12 and 16'], correctOptionIndex: 0, solution: 'Numbers = 3×5=15 and 4×5=20', difficulty: 'medium', category: 'HCF and LCM' },
        { question: 'Find the greatest number that divides 42, 63 and 84.', options: ['7', '14', '21', '42'], correctOptionIndex: 2, solution: 'HCF(42,63,84) = 21', difficulty: 'medium', category: 'HCF and LCM' },
        { question: 'The LCM of two numbers is 120 and their HCF is 10. If one number is 40, find the other.', options: ['20', '30', '40', '60'], correctOptionIndex: 1, solution: 'Other = (LCM × HCF)/40 = (120×10)/40 = 30', difficulty: 'medium', category: 'HCF and LCM' },
        { question: 'Find the smallest number divisible by both 12 and 18.', options: ['24', '36', '72', '108'], correctOptionIndex: 1, solution: 'LCM(12,18) = 36', difficulty: 'easy', category: 'HCF and LCM' },
        { question: 'Three bells ring at intervals of 4, 6 and 8 seconds. After how many seconds will they ring together?', options: ['12', '24', '48', '96'], correctOptionIndex: 1, solution: 'LCM(4,6,8) = 24 seconds', difficulty: 'medium', category: 'HCF and LCM' },
        { question: 'Find HCF of 56 and 98.', options: ['7', '14', '28', '2'], correctOptionIndex: 1, solution: 'HCF(56,98) = 14', difficulty: 'easy', category: 'HCF and LCM' },
        { question: 'Find LCM of 8, 12, 16.', options: ['24', '48', '96', '192'], correctOptionIndex: 1, solution: 'LCM(8,12,16) = 48', difficulty: 'easy', category: 'HCF and LCM' },
        { question: 'Two numbers have HCF 12 and LCM 360. If one is 72, find the other.', options: ['50', '60', '70', '80'], correctOptionIndex: 1, solution: 'Other = (12 × 360)/72 = 60', difficulty: 'medium', category: 'HCF and LCM' },
        { question: 'Find the smallest number which when divided by 5, 6, 8 leaves remainder 3.', options: ['123', '120', '117', '243'], correctOptionIndex: 0, solution: 'LCM(5,6,8) = 120. Answer = 120 + 3 = 123', difficulty: 'hard', category: 'HCF and LCM' },
        { question: 'The HCF of 65 and 117 is:', options: ['13', '26', '39', '1'], correctOptionIndex: 0, solution: 'HCF(65,117) = 13', difficulty: 'easy', category: 'HCF and LCM' },
        { question: 'Find LCM of 9 and 12.', options: ['36', '72', '108', '18'], correctOptionIndex: 0, solution: 'LCM(9,12) = 36', difficulty: 'easy', category: 'HCF and LCM' },
        { question: 'The ratio of two numbers is 3:5 and their LCM is 75. Find their HCF.', options: ['3', '5', '15', '25'], correctOptionIndex: 1, solution: 'Numbers = 3k and 5k. LCM = 15k = 75. k = 5 (HCF)', difficulty: 'medium', category: 'HCF and LCM' },
        { question: 'Find the largest 4-digit number exactly divisible by 88.', options: ['9944', '9952', '9960', '9968'], correctOptionIndex: 0, solution: '9999 ÷ 88 = 113.6. 113 × 88 = 9944', difficulty: 'medium', category: 'HCF and LCM' },
        { question: 'If HCF(a,b) = 1, what is LCM(a,b)?', options: ['a', 'b', 'a+b', 'a×b'], correctOptionIndex: 3, solution: 'If HCF = 1, then LCM = a × b', difficulty: 'easy', category: 'HCF and LCM' },
        { question: 'Find HCF of 144 and 180.', options: ['12', '18', '36', '6'], correctOptionIndex: 2, solution: 'HCF(144,180) = 36', difficulty: 'easy', category: 'HCF and LCM' },
        { question: 'Find the least number which when divided by 15, 20, 24 leaves no remainder.', options: ['60', '120', '180', '240'], correctOptionIndex: 1, solution: 'LCM(15,20,24) = 120', difficulty: 'medium', category: 'HCF and LCM' }
    ],
    'Average': [
        { question: 'The average of 5 numbers is 20. What is their sum?', options: ['80', '100', '120', '25'], correctOptionIndex: 1, solution: 'Sum = Average × Count = 20 × 5 = 100', difficulty: 'easy', category: 'Average' },
        { question: 'Find the average of first 10 natural numbers.', options: ['5', '5.5', '6', '10'], correctOptionIndex: 1, solution: 'Avg = (1+10)/2 = 5.5', difficulty: 'easy', category: 'Average' },
        { question: 'The average of 4 numbers is 25. If one number is removed, average becomes 20. Find the removed number.', options: ['30', '35', '40', '45'], correctOptionIndex: 2, solution: 'Sum of 4 = 100. Sum of 3 = 60. Removed = 40', difficulty: 'medium', category: 'Average' },
        { question: 'Average age of 5 students is 18. A new student joins making average 17. Find new students age.', options: ['10', '11', '12', '13'], correctOptionIndex: 2, solution: 'Old sum = 90. New sum = 102. New age = 102-90 = 12', difficulty: 'medium', category: 'Average' },
        { question: 'The average of 10, 20, 30, 40 is:', options: ['20', '25', '30', '100'], correctOptionIndex: 1, solution: 'Avg = (10+20+30+40)/4 = 100/4 = 25', difficulty: 'easy', category: 'Average' },
        { question: 'Average of 3 numbers is 15. Two numbers are 10 and 20. Find the third.', options: ['10', '15', '20', '25'], correctOptionIndex: 1, solution: 'Sum = 45. Third = 45 - 10 - 20 = 15', difficulty: 'easy', category: 'Average' },
        { question: 'A batsman scores 87 runs increasing average by 3 from 39. How many matches played now?', options: ['12', '14', '16', '18'], correctOptionIndex: 2, solution: 'Let n be matches. 39(n-1)+87=42n, n=16', difficulty: 'hard', category: 'Average' },
        { question: 'Average of first 5 multiples of 3 is:', options: ['6', '9', '12', '15'], correctOptionIndex: 1, solution: 'Multiples: 3,6,9,12,15. Avg = 45/5 = 9', difficulty: 'easy', category: 'Average' },
        { question: 'The average weight of A, B, C is 45 kg. If D joins, average becomes 43 kg. Find Ds weight.', options: ['35', '37', '39', '41'], correctOptionIndex: 1, solution: 'Sum of ABC = 135. Sum of ABCD = 172. D = 37', difficulty: 'medium', category: 'Average' },
        { question: 'Average of 20, 30, x is 30. Find x.', options: ['30', '35', '40', '45'], correctOptionIndex: 2, solution: 'Sum = 90. x = 90 - 20 - 30 = 40', difficulty: 'easy', category: 'Average' },
        { question: 'The average of first 50 natural numbers is:', options: ['25', '25.5', '26', '50'], correctOptionIndex: 1, solution: 'Avg = (1+50)/2 = 25.5', difficulty: 'easy', category: 'Average' },
        { question: 'Average of 5 consecutive odd numbers starting from 3 is:', options: ['5', '7', '9', '11'], correctOptionIndex: 1, solution: 'Numbers: 3,5,7,9,11. Avg = 35/5 = 7', difficulty: 'easy', category: 'Average' },
        { question: 'If average of 8 numbers is 15, their sum is:', options: ['100', '110', '120', '130'], correctOptionIndex: 2, solution: 'Sum = 8 × 15 = 120', difficulty: 'easy', category: 'Average' },
        { question: 'Average age of a family of 5 is 30 years. If a baby is born, new average is:', options: ['24', '25', '26', '27'], correctOptionIndex: 1, solution: 'Total = 150. New total = 150+0 = 150. Avg = 150/6 = 25', difficulty: 'medium', category: 'Average' },
        { question: 'The average of 11 results is 60. First 6 have average 58, last 6 have 63. Find 6th result.', options: ['66', '68', '70', '72'], correctOptionIndex: 0, solution: 'Total=660. First6=348. Last6=378. 6th=348+378-660=66', difficulty: 'hard', category: 'Average' },
        { question: 'Average of all even numbers from 2 to 20 is:', options: ['10', '11', '12', '22'], correctOptionIndex: 1, solution: 'Numbers: 2,4,6...20. Avg = (2+20)/2 = 11', difficulty: 'easy', category: 'Average' },
        { question: 'A student has average of 75 in 4 subjects. What should he score in 5th to get 80?', options: ['95', '100', '85', '90'], correctOptionIndex: 1, solution: 'Need total = 400. Has 300. Need 100', difficulty: 'medium', category: 'Average' },
        { question: 'Average of 7 consecutive numbers is 33. Largest is:', options: ['35', '36', '37', '39'], correctOptionIndex: 1, solution: 'Middle = 33. Largest = 33 + 3 = 36', difficulty: 'easy', category: 'Average' },
        { question: 'The average height of 30 students is 150 cm. 5 students of average 140 cm leave. New average?', options: ['151', '152', '153', '154'], correctOptionIndex: 1, solution: 'Total=4500. Leave=700. New=(4500-700)/25=152', difficulty: 'medium', category: 'Average' },
        { question: 'Average of a, a+2, a+4, a+6, a+8 is 22. Find a.', options: ['16', '18', '20', '22'], correctOptionIndex: 1, solution: 'Avg = a+4 = 22. So a = 18', difficulty: 'medium', category: 'Average' },
        { question: 'Average marks of 40 students is 75. Later found one mark was 80 instead of 50. Correct average?', options: ['75.25', '75.5', '75.75', '76'], correctOptionIndex: 2, solution: 'Difference = 30. New avg = 75 + 30/40 = 75.75', difficulty: 'medium', category: 'Average' }
    ],
    'Time, Speed and Distance': [
        { question: 'A car travels 60 km in 1 hour. How far in 2.5 hours?', options: ['120 km', '150 km', '180 km', '200 km'], correctOptionIndex: 1, solution: 'Distance = 60 × 2.5 = 150 km', difficulty: 'easy', category: 'Time, Speed and Distance' },
        { question: 'A train covers 300 km in 5 hours. Find its speed.', options: ['50 km/h', '60 km/h', '70 km/h', '75 km/h'], correctOptionIndex: 1, solution: 'Speed = 300/5 = 60 km/h', difficulty: 'easy', category: 'Time, Speed and Distance' },
        { question: 'A person walks at 5 km/h. How long to cover 15 km?', options: ['2 hrs', '2.5 hrs', '3 hrs', '3.5 hrs'], correctOptionIndex: 2, solution: 'Time = 15/5 = 3 hours', difficulty: 'easy', category: 'Time, Speed and Distance' },
        { question: 'Speed of a car is 72 km/h. Convert to m/s.', options: ['18 m/s', '20 m/s', '25 m/s', '36 m/s'], correctOptionIndex: 1, solution: '72 × 5/18 = 20 m/s', difficulty: 'easy', category: 'Time, Speed and Distance' },
        { question: 'Two trains going opposite at 40 and 60 km/h. Distance apart after 3 hrs?', options: ['200 km', '250 km', '300 km', '360 km'], correctOptionIndex: 2, solution: 'Relative speed = 100 km/h. Distance = 300 km', difficulty: 'medium', category: 'Time, Speed and Distance' },
        { question: 'A man covers half distance at 40 km/h and half at 60 km/h. Average speed?', options: ['48 km/h', '50 km/h', '52 km/h', '55 km/h'], correctOptionIndex: 0, solution: 'Avg = 2×40×60/(40+60) = 48 km/h', difficulty: 'medium', category: 'Time, Speed and Distance' },
        { question: 'A cyclist covers 12 km in 40 minutes. Speed in km/h?', options: ['15', '18', '20', '24'], correctOptionIndex: 1, solution: 'Speed = 12/(40/60) = 18 km/h', difficulty: 'easy', category: 'Time, Speed and Distance' },
        { question: 'A train 100m long passes a pole in 10 seconds. Speed?', options: ['10 m/s', '20 m/s', '36 km/h', '10 m/s or 36 km/h'], correctOptionIndex: 3, solution: 'Speed = 100/10 = 10 m/s = 36 km/h', difficulty: 'easy', category: 'Time, Speed and Distance' },
        { question: 'If speed increases by 20%, time decreases by?', options: ['16.67%', '20%', '25%', '33.33%'], correctOptionIndex: 0, solution: 'Time = 1/1.2 = 0.833. Decrease = 16.67%', difficulty: 'hard', category: 'Time, Speed and Distance' },
        { question: 'A car covers 120 km in 2 hrs. How long for 300 km?', options: ['4 hrs', '5 hrs', '6 hrs', '7 hrs'], correctOptionIndex: 1, solution: 'Speed = 60. Time = 300/60 = 5 hrs', difficulty: 'easy', category: 'Time, Speed and Distance' },
        { question: 'Convert 20 m/s to km/h.', options: ['54', '72', '80', '36'], correctOptionIndex: 1, solution: '20 × 18/5 = 72 km/h', difficulty: 'easy', category: 'Time, Speed and Distance' },
        { question: 'A bus travels at 45 km/h. Distance in 20 minutes?', options: ['10 km', '12 km', '15 km', '18 km'], correctOptionIndex: 2, solution: 'Distance = 45 × (20/60) = 15 km', difficulty: 'easy', category: 'Time, Speed and Distance' },
        { question: 'Two cars start 100 km apart toward each other at 30 and 20 km/h. When do they meet?', options: ['1 hr', '2 hrs', '3 hrs', '4 hrs'], correctOptionIndex: 1, solution: 'Relative speed = 50. Time = 100/50 = 2 hrs', difficulty: 'medium', category: 'Time, Speed and Distance' },
        { question: 'A train 150m passes platform 350m in 25 sec. Speed?', options: ['20 m/s', '72 km/h', 'Both', '18 m/s'], correctOptionIndex: 2, solution: 'Speed = 500/25 = 20 m/s = 72 km/h', difficulty: 'medium', category: 'Time, Speed and Distance' },
        { question: 'Walking at 3/4 of usual speed, a man is late by 20 min. Usual time?', options: ['40 min', '50 min', '60 min', '80 min'], correctOptionIndex: 2, solution: 'If speed = 3/4, time = 4/3. Extra = 1/3. 1/3 × t = 20. t = 60', difficulty: 'hard', category: 'Time, Speed and Distance' },
        { question: 'A car travels 100 km at 50 km/h and 150 km at 75 km/h. Average speed?', options: ['60 km/h', '62.5 km/h', '65 km/h', '67.5 km/h'], correctOptionIndex: 1, solution: 'Total = 250 km. Time = 2+2 = 4 hrs. Avg = 62.5', difficulty: 'medium', category: 'Time, Speed and Distance' },
        { question: 'A person runs 1 km in 4 minutes. Speed in km/h?', options: ['12', '15', '18', '20'], correctOptionIndex: 1, solution: 'Speed = 1/(4/60) = 15 km/h', difficulty: 'easy', category: 'Time, Speed and Distance' },
        { question: 'Two trains 200m and 300m long cross each other in 10 sec moving opposite. If speeds are 54 and 36 km/h, verify time.', options: ['10 sec', '12 sec', '8 sec', '15 sec'], correctOptionIndex: 0, solution: 'Rel speed = 90 km/h = 25 m/s. Time = 500/25 = 20 sec', difficulty: 'hard', category: 'Time, Speed and Distance' },
        { question: 'A train travels at 60 km/h. Time to cover 90 km?', options: ['1 hr', '1.5 hrs', '2 hrs', '2.5 hrs'], correctOptionIndex: 1, solution: 'Time = 90/60 = 1.5 hours', difficulty: 'easy', category: 'Time, Speed and Distance' },
        { question: 'Speed ratio A:B = 3:4. Time ratio for same distance?', options: ['3:4', '4:3', '9:16', '16:9'], correctOptionIndex: 1, solution: 'Time ratio = inverse of speed = 4:3', difficulty: 'medium', category: 'Time, Speed and Distance' },
        { question: 'A jogger runs 9 km in 1.5 hours. Speed?', options: ['4 km/h', '5 km/h', '6 km/h', '7 km/h'], correctOptionIndex: 2, solution: 'Speed = 9/1.5 = 6 km/h', difficulty: 'easy', category: 'Time, Speed and Distance' }
    ],
    'Percentage': [
        { question: 'What is 25% of 200?', options: ['40', '50', '60', '75'], correctOptionIndex: 1, solution: '25% of 200 = 50', difficulty: 'easy', category: 'Percentage' },
        { question: '40 is what percent of 200?', options: ['15%', '20%', '25%', '30%'], correctOptionIndex: 1, solution: '(40/200) × 100 = 20%', difficulty: 'easy', category: 'Percentage' },
        { question: 'A number increased by 20% becomes 60. Find the number.', options: ['48', '50', '52', '55'], correctOptionIndex: 1, solution: 'x × 1.2 = 60. x = 50', difficulty: 'easy', category: 'Percentage' },
        { question: 'If price increases 25%, what % should consumption decrease to keep expenditure same?', options: ['20%', '25%', '30%', '33%'], correctOptionIndex: 0, solution: 'Decrease = 25/125 × 100 = 20%', difficulty: 'medium', category: 'Percentage' },
        { question: '60% of a number is 90. Find the number.', options: ['120', '150', '180', '200'], correctOptionIndex: 1, solution: '0.6x = 90. x = 150', difficulty: 'easy', category: 'Percentage' },
        { question: 'A increases by 10% then decreases by 10%. Net change?', options: ['-1%', '0%', '+1%', '-2%'], correctOptionIndex: 0, solution: '1.1 × 0.9 = 0.99 = -1%', difficulty: 'medium', category: 'Percentage' },
        { question: 'Population increases 10000 to 12100 in 2 years. Annual rate?', options: ['10%', '11%', '15%', '20%'], correctOptionIndex: 0, solution: '10000 × (1+r)² = 12100. r = 10%', difficulty: 'medium', category: 'Percentage' },
        { question: '75% of 80 equals what percent of 120?', options: ['40%', '50%', '60%', '75%'], correctOptionIndex: 1, solution: '75% of 80 = 60. 60/120 × 100 = 50%', difficulty: 'medium', category: 'Percentage' },
        { question: 'What is 15% of 300?', options: ['35', '40', '45', '50'], correctOptionIndex: 2, solution: '15% of 300 = 45', difficulty: 'easy', category: 'Percentage' },
        { question: 'Express 3/4 as a percentage.', options: ['60%', '70%', '75%', '80%'], correctOptionIndex: 2, solution: '3/4 × 100 = 75%', difficulty: 'easy', category: 'Percentage' },
        { question: 'A bag sold for Rs.100 with 25% profit. Cost price?', options: ['Rs.75', 'Rs.80', 'Rs.85', 'Rs.90'], correctOptionIndex: 1, solution: 'CP = 100/1.25 = 80', difficulty: 'medium', category: 'Percentage' },
        { question: 'What percent is 18 of 90?', options: ['15%', '18%', '20%', '25%'], correctOptionIndex: 2, solution: '18/90 × 100 = 20%', difficulty: 'easy', category: 'Percentage' },
        { question: 'If 20% of A = 30% of B, then A:B is:', options: ['2:3', '3:2', '4:3', '3:4'], correctOptionIndex: 1, solution: '0.2A = 0.3B. A/B = 3/2', difficulty: 'medium', category: 'Percentage' },
        { question: 'A salary is increased by 10% then decreased by 10%. Net change?', options: ['No change', '+1%', '-1%', '+10%'], correctOptionIndex: 2, solution: '1.1 × 0.9 = 0.99 = -1%', difficulty: 'medium', category: 'Percentage' },
        { question: 'Find 33.33% of 99.', options: ['30', '33', '36', '39'], correctOptionIndex: 1, solution: '1/3 of 99 = 33', difficulty: 'easy', category: 'Percentage' },
        { question: '20 is increased to 25. Percentage increase?', options: ['20%', '25%', '30%', '50%'], correctOptionIndex: 1, solution: 'Increase = 5/20 × 100 = 25%', difficulty: 'easy', category: 'Percentage' },
        { question: 'If 40% of x = 100, find x.', options: ['200', '250', '300', '400'], correctOptionIndex: 1, solution: '0.4x = 100. x = 250', difficulty: 'easy', category: 'Percentage' },
        { question: 'Two successive discounts of 20% and 10% equal single discount of:', options: ['28%', '30%', '27%', '25%'], correctOptionIndex: 0, solution: 'Net = 1 - (0.8 × 0.9) = 1 - 0.72 = 28%', difficulty: 'medium', category: 'Percentage' },
        { question: 'Express 0.125 as a percentage.', options: ['1.25%', '12.5%', '125%', '0.125%'], correctOptionIndex: 1, solution: '0.125 × 100 = 12.5%', difficulty: 'easy', category: 'Percentage' },
        { question: 'If A is 20% more than B, B is what % less than A?', options: ['16.67%', '20%', '25%', '15%'], correctOptionIndex: 0, solution: 'B less = 20/120 × 100 = 16.67%', difficulty: 'medium', category: 'Percentage' },
        { question: 'What is 200% of 50?', options: ['25', '50', '100', '150'], correctOptionIndex: 2, solution: '200% of 50 = 2 × 50 = 100', difficulty: 'easy', category: 'Percentage' }
    ],
    'Time & Work': [
        { question: 'A can do a work in 10 days. Work done in 1 day?', options: ['1/5', '1/10', '1/15', '1/20'], correctOptionIndex: 1, solution: 'Work per day = 1/10', difficulty: 'easy', category: 'Time & Work' },
        { question: 'A can do work in 10 days, B in 15 days. Together?', options: ['5 days', '6 days', '7 days', '8 days'], correctOptionIndex: 1, solution: 'Combined = 1/10 + 1/15 = 1/6. Days = 6', difficulty: 'medium', category: 'Time & Work' },
        { question: 'A is twice as efficient as B. A takes 12 days. B takes?', options: ['18', '20', '24', '30'], correctOptionIndex: 2, solution: 'B takes 2 × 12 = 24 days', difficulty: 'easy', category: 'Time & Work' },
        { question: '10 men can do work in 15 days. How many men for 10 days?', options: ['12', '15', '18', '20'], correctOptionIndex: 1, solution: 'Men × Days = constant. 10×15 = x×10. x = 15', difficulty: 'medium', category: 'Time & Work' },
        { question: 'A and B together in 6 days. A alone in 10 days. B alone?', options: ['12 days', '15 days', '18 days', '20 days'], correctOptionIndex: 1, solution: '1/6 - 1/10 = 1/15. B = 15 days', difficulty: 'medium', category: 'Time & Work' },
        { question: 'A can complete 1/3 of work in 5 days. Full work in?', options: ['10', '12', '15', '18'], correctOptionIndex: 2, solution: 'Full work = 5 × 3 = 15 days', difficulty: 'easy', category: 'Time & Work' },
        { question: '6 workers complete job in 8 days. 4 workers take?', options: ['10', '12', '14', '16'], correctOptionIndex: 1, solution: '6×8 = 4×x. x = 12 days', difficulty: 'easy', category: 'Time & Work' },
        { question: 'A does half work in 8 days. Full work in?', options: ['12', '14', '16', '18'], correctOptionIndex: 2, solution: 'Full = 8 × 2 = 16 days', difficulty: 'easy', category: 'Time & Work' },
        { question: 'A works 2x as fast as B. Together in 12 days. A alone?', options: ['16', '18', '20', '24'], correctOptionIndex: 1, solution: 'A = 2B. (A+B)/work = 3B = 1/12. A = 2/36. A alone = 18', difficulty: 'hard', category: 'Time & Work' },
        { question: 'If 4 men or 6 women can do work in 12 days, 2 men and 3 women take?', options: ['10', '12', '14', '16'], correctOptionIndex: 1, solution: '2M+3W = 1M+3W+1M = work of (3+3)=6W or 4M in 12 days', difficulty: 'hard', category: 'Time & Work' },
        { question: 'A can do work in 20 days. Work done in 4 days?', options: ['1/4', '1/5', '4/5', '1/20'], correctOptionIndex: 1, solution: 'Work = 4/20 = 1/5', difficulty: 'easy', category: 'Time & Work' },
        { question: 'A takes 6 days, B takes 12 days. Together?', options: ['3', '4', '5', '6'], correctOptionIndex: 1, solution: '1/6 + 1/12 = 3/12 = 1/4. Together = 4 days', difficulty: 'easy', category: 'Time & Work' },
        { question: 'Work done by A in 1 day = 1/8. Days to complete?', options: ['6', '8', '10', '12'], correctOptionIndex: 1, solution: 'Total days = 1/(1/8) = 8', difficulty: 'easy', category: 'Time & Work' },
        { question: '15 men do work in 20 days. After 10 days, 5 leave. Total days?', options: ['25', '30', '35', '28'], correctOptionIndex: 1, solution: 'Work done = 1/2. Remaining = 1/2 by 10 men = 10 days. Total = 30', difficulty: 'medium', category: 'Time & Work' },
        { question: 'A is 3x efficient as B. Together in 15 days. A alone?', options: ['18', '20', '24', '30'], correctOptionIndex: 1, solution: 'A+B = 4B = 1/15. A = 3/60. A alone = 20 days', difficulty: 'medium', category: 'Time & Work' },
        { question: '20 men can do work in 25 days. 25 men take?', options: ['18', '20', '22', '24'], correctOptionIndex: 1, solution: '20×25 = 25×x. x = 20 days', difficulty: 'easy', category: 'Time & Work' },
        { question: 'A does 1/3 work in 10 days. B does 2/3 in 20 days. Together?', options: ['12', '15', '18', '20'], correctOptionIndex: 1, solution: 'A = 30 days, B = 30 days. Together = 15 days', difficulty: 'medium', category: 'Time & Work' },
        { question: 'Pipe A fills in 6 hrs, B empties in 8 hrs. Both open, fill in?', options: ['20', '24', '28', '32'], correctOptionIndex: 1, solution: 'Net = 1/6 - 1/8 = 1/24. Time = 24 hrs', difficulty: 'medium', category: 'Time & Work' },
        { question: 'A can do in 10 days, B in 15, C in 20. All together?', options: ['4.6', '5', '5.5', '6'], correctOptionIndex: 0, solution: '1/10+1/15+1/20 = 13/60. Days = 60/13 ≈ 4.6', difficulty: 'medium', category: 'Time & Work' },
        { question: 'If 8 men finish in 12 days working 6 hrs/day, 6 men working 8 hrs/day finish in?', options: ['10', '12', '14', '16'], correctOptionIndex: 1, solution: '8×12×6 = 6×x×8. x = 12 days', difficulty: 'medium', category: 'Time & Work' },
        { question: 'A takes 20% less time than B for same work. If B takes 25 days, A takes?', options: ['18', '20', '22', '24'], correctOptionIndex: 1, solution: 'A = 25 × 0.8 = 20 days', difficulty: 'easy', category: 'Time & Work' }
    ],
    'Directions': [
        { question: 'A person walks 4 km North, then turns right and walks 3 km. How far is he from the starting point?', options: ['5 km', '7 km', '1 km', '12 km'], correctOptionIndex: 0, solution: 'Hypotenuse = √(4^2 + 3^2) = 5 km', difficulty: 'easy', category: 'Directions' },
        { question: 'A man facing North turns 90 degrees clockwise. Which direction is he facing now?', options: ['North', 'East', 'South', 'West'], correctOptionIndex: 1, solution: 'North + 90° clockwise = East', difficulty: 'easy', category: 'Directions' },
        { question: 'Ram walks 10 km South, then turns left and walks 5 km. Which direction is he from the start?', options: ['South-East', 'South-West', 'North-East', 'North-West'], correctOptionIndex: 0, solution: 'South then Left (East) -> South-East', difficulty: 'medium', category: 'Directions' },
        { question: 'Sun rises in the East. If you face North, which direction is on your right?', options: ['West', 'South', 'East', 'North'], correctOptionIndex: 2, solution: 'Right of North is East', difficulty: 'easy', category: 'Directions' },
        { question: 'A starts from a point, walks 2 km North, turns right walks 2 km, turns right again, walks 2 km. Direction from start?', options: ['East', 'West', 'North', 'South'], correctOptionIndex: 0, solution: 'Final position is 2km East', difficulty: 'medium', category: 'Directions' }
    ],
    'Problems on Ages': [
        { question: 'The age of father is 3 times his son. If son is 15, how old is father?', options: ['30', '40', '45', '50'], correctOptionIndex: 2, solution: '3 * 15 = 45', difficulty: 'easy', category: 'Problems on Ages' },
        { question: 'A is 2 years older than B who is twice as old as C. If A+B+C = 27, how old is B?', options: ['7', '8', '9', '10'], correctOptionIndex: 3, solution: 'C=x, B=2x, A=2x+2. 5x+2=27, x=5. B=10', difficulty: 'medium', category: 'Problems on Ages' },
        { question: 'Ratio of ages of A and B is 4:5. If sum is 81, find A\'s age.', options: ['36', '45', '35', '40'], correctOptionIndex: 0, solution: '9x = 81 -> x=9. A = 4*9 = 36', difficulty: 'easy', category: 'Problems on Ages' },
        { question: 'Present ages of A and B are in ratio 5:6. Seven years hence ratio is 6:7. Present age of A?', options: ['35', '40', '30', '42'], correctOptionIndex: 0, solution: 'gap is 1 part = 7 years. A = 5 * 7 = 35', difficulty: 'medium', category: 'Problems on Ages' }
    ],
    'Blood Relation': [
        { question: 'A is the brother of B. B is the sister of C. How is A related to C?', options: ['Father', 'Brother', 'Uncle', 'Son'], correctOptionIndex: 1, solution: 'A is male (brother). A and B are siblings. B and C are siblings. So A is brother of C', difficulty: 'easy', category: 'Blood Relation' },
        { question: 'Pointing to a photo, a man said "She is the daughter of my grandfather\'s only son". How is she related to him?', options: ['Sister', 'Cousin', 'Aunt', 'Mother'], correctOptionIndex: 0, solution: 'Grandfather\'s only son is father. Father\'s daughter is sister', difficulty: 'medium', category: 'Blood Relation' },
        { question: 'A is B\'s sister. C is B\'s mother. D is C\'s father. How is A related to D?', options: ['Granddaughter', 'Daughter', 'Grandmother', 'Aunt'], correctOptionIndex: 0, solution: 'A is daughter of C. C is daughter of D. So A is granddaughter of D', difficulty: 'medium', category: 'Blood Relation' }
    ],
    'Number Series': [
        { question: 'Find next: 2, 5, 10, 17, ?', options: ['24', '25', '26', '27'], correctOptionIndex: 2, solution: '+3, +5, +7, +9. 17+9=26', difficulty: 'easy', category: 'Number Series' },
        { question: 'Find next: 1, 8, 27, 64, ?', options: ['100', '125', '121', '144'], correctOptionIndex: 1, solution: 'Cubes: 1, 2, 3, 4, 5^3=125', difficulty: 'medium', category: 'Number Series' },
        { question: 'Find next: 8, 24, 12, 36, 18, ?', options: ['54', '24', '48', '72'], correctOptionIndex: 0, solution: '*3, /2, *3, /2, *3. 18*3=54', difficulty: 'hard', category: 'Number Series' }
    ],
    'Ratio & Proportion': [
        { question: 'If A:B=2:3 and B:C=4:5, find A:C', options: ['8:15', '2:5', '4:5', '6:15'], correctOptionIndex: 0, solution: 'A/B * B/C = A/C = 2/3 * 4/5 = 8/15', difficulty: 'easy', category: 'Ratio & Proportion' },
        { question: 'Divide 1000 in ratio 2:3', options: ['200:800', '400:600', '300:700', '500:500'], correctOptionIndex: 1, solution: 'Part 1 = 2/5 * 1000 = 400. Part 2 = 600', difficulty: 'easy', category: 'Ratio & Proportion' },
        { question: 'Fourth proportional to 4, 8, 12 is?', options: ['18', '20', '22', '24'], correctOptionIndex: 3, solution: '4/8 = 12/x. x=24', difficulty: 'medium', category: 'Ratio & Proportion' }
    ],
    'Mixture & Alligation': [
        { question: 'In what ratio must rice at $10/kg be mixed with rice at $15/kg to get $12/kg?', options: ['3:2', '2:3', '1:1', '4:1'], correctOptionIndex: 0, solution: 'Alligation: (15-12):(12-10) = 3:2', difficulty: 'medium', category: 'Mixture & Alligation' },
        { question: 'Milk and water in ratio 3:1. How much water to add to make it 1:1 if total is 40L?', options: ['10L', '20L', '30L', '5L'], correctOptionIndex: 1, solution: 'Milk=30, Water=10. New Water=30. Add 20L', difficulty: 'hard', category: 'Mixture & Alligation' }
    ],
    'Alphanumeric Series': [
        { question: 'Find next: A1, C3, E5, ?', options: ['G7', 'F6', 'H8', 'G8'], correctOptionIndex: 0, solution: 'Letters +2, Numbers +2. G7', difficulty: 'easy', category: 'Alphanumeric Series' },
        { question: 'Find next: 2B, 4C, 8E, 14H, ?', options: ['22L', '20K', '22K', '18J'], correctOptionIndex: 0, solution: 'Num: +2,+4,+6,+8 -> 22. Lett: +1,+2,+3,+4 -> L', difficulty: 'medium', category: 'Alphanumeric Series' }
    ],
    'Simple Interest': [
        { question: 'P=1000, R=10%, T=2 yrs. SI?', options: ['100', '200', '300', '400'], correctOptionIndex: 1, solution: 'SI = PRT/100 = 200', difficulty: 'easy', category: 'Simple Interest' },
        { question: 'Sum doubles in 5 years at SI. Rate?', options: ['10%', '15%', '20%', '25%'], correctOptionIndex: 2, solution: 'SI=P. P = P*R*5/100. R=20%', difficulty: 'medium', category: 'Simple Interest' }
    ],
    'Compound Interest': [
        { question: 'P=1000, R=10%, T=2 yrs. CI?', options: ['200', '210', '220', '250'], correctOptionIndex: 1, solution: 'A = 1000(1.1)^2 = 1210. CI = 210', difficulty: 'medium', category: 'Compound Interest' },
        { question: 'Difference between CI and SI for 2 yrs at 10% on 1000?', options: ['10', '20', '30', '0'], correctOptionIndex: 0, solution: 'SI=200, CI=210. Diff=10', difficulty: 'hard', category: 'Compound Interest' }
    ],
    'Seating Arrangement 1': [
        { question: '5 people A,B,C,D,E in a row. C is in middle. A is left of B. B is left of C. Order?', options: ['ABCDE', 'BACDE', 'ABCED', 'ABDEC'], correctOptionIndex: 0, solution: 'A-B-C. Others flexible', difficulty: 'easy', category: 'Seating Arrangement 1' }
    ],
    'Seating Arrangement 2': [
        { question: '6 people in circle facing center. A opposite B. C between A and D. Who is opposite C?', options: ['D', 'E', 'F', 'B'], correctOptionIndex: 1, solution: 'Requires diagram. Usually implies symmetric placement', difficulty: 'hard', category: 'Seating Arrangement 2' }
    ],
    'Data Interpretation': [
        { question: 'Pie chart 360 deg = 100%. Angle for 25%?', options: ['60', '90', '120', '45'], correctOptionIndex: 1, solution: '25/100 * 360 = 90 degrees', difficulty: 'easy', category: 'Data Interpretation' }
    ]
};

// Default fallback for unknown categories (20+ questions)
const defaultFallback = [
    { question: 'If 5 + 3 = 8, what is 15 + 9?', options: ['22', '24', '26', '28'], correctOptionIndex: 1, solution: '15 + 9 = 24', difficulty: 'easy', category: 'General Aptitude' },
    { question: 'What comes next: 2, 4, 8, 16, ?', options: ['20', '24', '32', '64'], correctOptionIndex: 2, solution: 'Pattern: ×2. Next = 32', difficulty: 'easy', category: 'General Aptitude' },
    { question: 'If 6 pens cost Rs. 30, how much do 10 pens cost?', options: ['Rs. 40', 'Rs. 50', 'Rs. 60', 'Rs. 100'], correctOptionIndex: 1, solution: 'Cost = (30/6) × 10 = 50', difficulty: 'easy', category: 'General Aptitude' },
    { question: 'A is 2 yrs older than B. B is 3 yrs older than C. A is how many yrs older than C?', options: ['4', '5', '6', '7'], correctOptionIndex: 1, solution: 'A - C = 2 + 3 = 5 years', difficulty: 'easy', category: 'General Aptitude' },
    { question: 'Find the odd one out: 2, 5, 10, 17, 28', options: ['2', '5', '17', '28'], correctOptionIndex: 3, solution: 'Pattern: +3, +5, +7, +9. 17+9=26, not 28', difficulty: 'medium', category: 'General Aptitude' },
    { question: 'Complete: 1, 1, 2, 3, 5, 8, ?', options: ['10', '11', '12', '13'], correctOptionIndex: 3, solution: 'Fibonacci: 5+8=13', difficulty: 'easy', category: 'General Aptitude' },
    { question: 'If 20% of a number is 30, what is 50% of that number?', options: ['60', '75', '90', '100'], correctOptionIndex: 1, solution: 'Number = 150. 50% of 150 = 75', difficulty: 'easy', category: 'General Aptitude' },
    { question: 'A clock shows 3:15. Angle between hands?', options: ['0°', '7.5°', '15°', '30°'], correctOptionIndex: 1, solution: 'Hour at 97.5°, Min at 90°. Diff = 7.5°', difficulty: 'medium', category: 'General Aptitude' },
    { question: 'If APPLE = 50, what is CAT?', options: ['24', '27', '30', '33'], correctOptionIndex: 0, solution: 'C=3, A=1, T=20. Sum = 24', difficulty: 'easy', category: 'General Aptitude' },
    { question: 'Find next: 3, 6, 11, 18, ?', options: ['25', '27', '29', '31'], correctOptionIndex: 1, solution: 'Pattern: +3, +5, +7, +9. Next = 27', difficulty: 'easy', category: 'General Aptitude' },
    { question: 'If A = 1, B = 2, what is Z?', options: ['24', '25', '26', '27'], correctOptionIndex: 2, solution: 'Z is 26th letter = 26', difficulty: 'easy', category: 'General Aptitude' },
    { question: 'What day comes 3 days after Monday?', options: ['Wednesday', 'Thursday', 'Friday', 'Saturday'], correctOptionIndex: 1, solution: 'Mon → Tue → Wed → Thu', difficulty: 'easy', category: 'General Aptitude' },
    { question: '7 × 8 + 9 × 3 = ?', options: ['72', '83', '85', '89'], correctOptionIndex: 1, solution: '56 + 27 = 83', difficulty: 'easy', category: 'General Aptitude' },
    { question: 'If 100 - x = 45, find x.', options: ['45', '50', '55', '65'], correctOptionIndex: 2, solution: 'x = 100 - 45 = 55', difficulty: 'easy', category: 'General Aptitude' },
    { question: 'Square of 15 is?', options: ['215', '225', '235', '245'], correctOptionIndex: 1, solution: '15² = 225', difficulty: 'easy', category: 'General Aptitude' },
    { question: 'What is 1/4 of 100?', options: ['20', '25', '30', '40'], correctOptionIndex: 1, solution: '100/4 = 25', difficulty: 'easy', category: 'General Aptitude' },
    { question: 'If pen:write, then knife:?', options: ['cut', 'sharp', 'metal', 'kitchen'], correctOptionIndex: 0, solution: 'Pen is used to write, knife to cut', difficulty: 'easy', category: 'General Aptitude' },
    { question: 'How many seconds in 5 minutes?', options: ['200', '250', '300', '350'], correctOptionIndex: 2, solution: '5 × 60 = 300', difficulty: 'easy', category: 'General Aptitude' },
    { question: 'Find: 12 + 24 + 36 + 48', options: ['100', '110', '120', '130'], correctOptionIndex: 2, solution: 'Sum = 120', difficulty: 'easy', category: 'General Aptitude' },
    { question: 'If 3x = 27, x = ?', options: ['6', '7', '8', '9'], correctOptionIndex: 3, solution: 'x = 27/3 = 9', difficulty: 'easy', category: 'General Aptitude' },
    { question: 'Complete: 100, 95, 90, 85, ?', options: ['75', '78', '80', '82'], correctOptionIndex: 2, solution: 'Pattern: -5. Next = 80', difficulty: 'easy', category: 'General Aptitude' }
];

// Shuffle array
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Get fallback questions
/**
 * Selects a set of high-quality fallback questions based on category and difficulty.
 * @param {string} category - The question topic.
 * @param {number} n - The number of questions requested.
 * @param {string} difficulty - The desired difficulty level.
 * @returns {Array} A randomized list of fallback questions.
 */
function getFallbackQuestions(category, n, difficulty) {
    console.log(`Fallback requested: Category="${category}", n=${n}, Difficulty="${difficulty}"`);
    let questions = fallbackQuestionBank[category] || defaultFallback;
    console.log(`Questions found in bank: ${questions.length}`);

    if (difficulty && difficulty !== 'mixed') {
        const filtered = questions.filter(q => q.difficulty === difficulty);
        console.log(`Filtered by difficulty ("${difficulty}"): ${filtered.length}`);
        if (filtered.length >= n) {
            questions = filtered;
        } else {
            console.log(`Not enough "${difficulty}" questions (${filtered.length} < ${n}), using all difficulties for this category`);
        }
    }

    const result = shuffle(questions).slice(0, n);
    console.log(`Returning ${result.length} questions`);
    return result;
}

/**
 * Primary interface for generating aptitude questions.
 * Attempts AI generation with a robust fallback to a local question bank on failure.
 * 
 * @param {Object} params - Generation configuration.
 * @param {string} params.category - The topic name.
 * @param {string} params.milestone - Associated milestone name.
 * @param {number} params.n - Number of questions to generate.
 * @param {string} params.difficulty - Desired difficulty level.
 * @returns {Promise<Object>} Formatted session object containing questions.
 */
async function generateQuestions({ category, milestone, n, difficulty }) {
    const systemMessage = `You are an expert aptitude trainer. Generate ${n} MCQs for "${category}". Rules:
1. Output valid JSON only.
2. Each: "question", "options" (4), "correctOptionIndex" (0-3), "solution", "difficulty", "category".
3. Vary scenarios. Use metric units. ALL questions MUST be about "${category}" only.`;

    const userMessage = `Generate ${n} aptitude MCQs for "${category}", milestone "${milestone}", difficulty: ${difficulty}.
Return: { "sessionId": "id", "category": "${category}", "milestone": "${milestone}", "questions": [...] }`;

    try {
        // Construct the AI content generation request
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.OPENAI_API_KEY}`,
            { contents: [{ parts: [{ text: systemMessage + '\n\n' + userMessage }] }], generationConfig: { temperature: 0.9, maxOutputTokens: 6000 } },
            { headers: { 'Content-Type': 'application/json' } }
        );
        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Use regex to locate and extract the JSON block from the AI's markdown response
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text);
    } catch (err) {
        // Log the failure reason and trigger the fallback mechanism to maintain system uptime
        const errorMsg = err.response?.data?.error?.message || err.message;
        console.error(`[AI Generator] Failed to generate questions for "${category}":`, errorMsg);

        const fallbackQs = getFallbackQuestions(category, n, difficulty);
        console.log(`[AI Generator] Serving ${fallbackQs.length} fallback questions for "${category}"`);

        return { sessionId: `fallback_${Date.now()}`, category, milestone, questions: fallbackQs };
    }
}

module.exports = { generateQuestions };
