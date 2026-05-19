/**
 * seed.js — Run once to populate MongoDB with initial data.
 * Usage: node seed.js
 * Safe to re-run — checks for existing data before inserting.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('./models/User');
const Product  = require('./models/Product');

const SEED_USERS = [
    { username: 'Jumailah',    password: 'Jums@12345',   firstName: 'Jumailah',      middleName: 'A.', lastName: 'Mamalampac', address: '3rd st. MSU Lomidong',    email: 'jumailah@ite193.edu' },
    { username: 'Norhadi',     password: 'Haddy2003!',   firstName: 'Norhadi',       middleName: 'M.', lastName: 'Norodin',    address: 'Campo Ranao Marawi City', email: 'norhadi@ite193.edu'  },
    { username: 'Khim10',      password: 'Khim@12345',   firstName: 'Khim',          middleName: 'S.', lastName: 'Limbona',    address: 'MSU Sikap',               email: 'khim@ite193.edu'     },
    { username: 'Norsaima0987',password: 'Norsaima@bts', firstName: 'Norsaima',      middleName: 'S.', lastName: 'Bascara',    address: '1st st. MSU Marawi',      email: 'norsaima@ite193.edu' },
    { username: 'Yasser4567',  password: 'Yasser@cics',  firstName: "Moh'd Yasser",  middleName: 'S.', lastName: 'Mauidala',   address: '5th St. MSU Dimalna',     email: 'yass@ite193.edu'     },
    { username: 'Arafat3390',  password: 'Arafat@2005',  firstName: 'Arafat',        middleName: 'M.', lastName: 'Macapantao', address: 'MSU Fisheries',           email: 'arafat@ite193.edu'   },
    { username: 'Asniah',      password: 'Asniah@2006',  firstName: 'Asniah',        middleName: 'M.', lastName: 'Zapanta',    address: 'Angoyao',                 email: 'asniah@ite193.edu'   },
    { username: 'Abdulazis',   password: 'Azis@2003!',   firstName: 'Abdulazis',     middleName: 'S.', lastName: 'Edres',      address: 'Barrio Salam',            email: 'azis@ite193.edu'     },
];

const SEED_PRODUCTS = [
    { code: 'P001', name: 'Lucky Me Pancit Canton',       quantity: 50,  price: 15, emoji: '🍜', image: 'img/lucky-me.png',        category: 'Instant Noodles' },
    { code: 'P002', name: 'Nissin Cup Noodles',           quantity: 40,  price: 20, emoji: '🍵', image: 'img/nissin-cup.jpg',       category: 'Instant Noodles' },
    { code: 'P003', name: 'Skyflakes Crackers',           quantity: 60,  price: 12, emoji: '🍪', image: 'img/skyflakes.png',        category: 'Snacks'          },
    { code: 'P004', name: 'Nova Country Cheddar',         quantity: 45,  price: 10, emoji: '🧀', image: 'img/nova.png',             category: 'Snacks'          },
    { code: 'P005', name: 'Clover Chips BBQ',             quantity: 55,  price: 10, emoji: '🌽', image: 'img/Clover-Chips.png',     category: 'Snacks'          },
    { code: 'P006', name: 'Rebisco Butter Cookies',       quantity: 30,  price: 18, emoji: '🍪', image: 'img/rebisco.png',          category: 'Biscuits'        },
    { code: 'P007', name: 'Hansel Sandwich Cookies',      quantity: 35,  price: 16, emoji: '🍫', image: 'img/hansel.png',           category: 'Biscuits'        },
    { code: 'P008', name: 'Coca-Cola 250ml',              quantity: 48,  price: 25, emoji: '🥤', image: 'img/coca-cola.png',        category: 'Beverages'       },
    { code: 'P009', name: 'Sprite 250ml',                 quantity: 48,  price: 25, emoji: '🥤', image: 'img/sprite.png',           category: 'Beverages'       },
    { code: 'P010', name: 'Royal Tru-Orange 250ml',       quantity: 36,  price: 25, emoji: '🍊', image: 'img/royal.png',            category: 'Beverages'       },
    { code: 'P011', name: 'Nescafe 3-in-1 Sachet',        quantity: 100, price:  8, emoji: '☕', image: 'img/Nescafe.png',          category: 'Coffee/Drinks'   },
    { code: 'P012', name: 'Milo Sachet 22g',              quantity: 80,  price: 10, emoji: '🍫', image: 'img/milo.png',             category: 'Coffee/Drinks'   },
    { code: 'P013', name: 'Eden Cheese 165g',             quantity: 25,  price: 78, emoji: '🧀', image: 'img/Eden-Cheese.png',      category: 'Dairy'           },
    { code: 'P014', name: 'Bear Brand Milk 33g',          quantity: 60,  price: 15, emoji: '🥛', image: 'img/Bear-Brand.png',       category: 'Dairy'           },
    { code: 'P015', name: 'Century Tuna Hot & Spicy',     quantity: 40,  price: 28, emoji: '🐟', image: 'img/Century-Tuna.png',     category: 'Canned Goods'    },
    { code: 'P016', name: 'Argentina Corned Beef 150g',   quantity: 35,  price: 45, emoji: '🥩', image: 'img/argentina.png',        category: 'Canned Goods'    },
    { code: 'P017', name: '555 Sardines in Tomato Sauce', quantity: 50,  price: 20, emoji: '🐠', image: 'img/Tomato-Sardines.png',  category: 'Canned Goods'    },
    { code: 'P018', name: 'Safeguard Bar Soap 60g',       quantity: 30,  price: 22, emoji: '🧼', image: 'img/SafeGuard.png',        category: 'Personal Care'   },
    { code: 'P019', name: 'Palmolive Shampoo Sachet',     quantity: 70,  price:  7, emoji: '🧴', image: 'img/palmolive.png',        category: 'Personal Care'   },
    { code: 'P020', name: 'Colgate Toothpaste 40ml',      quantity: 25,  price: 35, emoji: '🪥', image: 'img/colgate.png',          category: 'Personal Care'   },
    { code: 'P021', name: 'White King Detergent 60g',     quantity: 60,  price:  8, emoji: '🧺', image: 'img/White-King.png',       category: 'Household'       },
    { code: 'P022', name: 'Champion Detergent Sachet',    quantity: 55,  price:  7, emoji: '🫧', image: 'img/champion.png',         category: 'Household'       },
    { code: 'P023', name: 'Marlboro Red Cigarette',       quantity: 100, price:  5, emoji: '🚬', image: 'img/marlboro.png',         category: 'Tobacco'         },
    { code: 'P024', name: 'White Refined Sugar 250g',     quantity: 20,  price: 30, emoji: '🍬', image: 'img/Sugar.png',            category: 'Condiments'      },
    { code: 'P025', name: 'Ajinomoto Seasoning 11g',      quantity: 40,  price:  5, emoji: '🧂', image: 'img/Ajinomoto.png',        category: 'Condiments'      },
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB for seeding.');

        // ── Seed Products ──
        const productCount = await Product.countDocuments();
        if (productCount === 0) {
            await Product.insertMany(SEED_PRODUCTS);
            console.log(`📦 Seeded ${SEED_PRODUCTS.length} products.`);
        } else {
            console.log(`📦 Products already seeded (${productCount} found). Skipping.`);
        }

        // ── Seed Users (cashiers) ──
        const userCount = await User.countDocuments({ role: 'cashier' });
        if (userCount === 0) {
            const hashed = await Promise.all(
                SEED_USERS.map(async u => ({
                    username:     u.username,
                    passwordHash: await bcrypt.hash(u.password, 12),
                    firstName:    u.firstName,
                    middleName:   u.middleName || '',
                    lastName:     u.lastName,
                    address:      u.address,
                    email:        u.email.toLowerCase(),
                    role:         'cashier',
                    status:       'active'   // pre-approved seed accounts
                }))
            );
            await User.insertMany(hashed);
            console.log(`👥 Seeded ${SEED_USERS.length} cashier accounts (all set to active).`);
        } else {
            console.log(`👥 Users already seeded (${userCount} found). Skipping.`);
        }

        console.log('\n🎉 Seeding complete! Run "node server.js" to start the app.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        process.exit(1);
    }
}

seed();
