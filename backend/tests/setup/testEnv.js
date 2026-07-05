if (!process.env.DATABASE_URL && process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST
}

process.env.NODE_ENV = 'test'
process.env.SMTP_USER = ''
process.env.SMTP_PASS = ''
process.env.SMTP_SENDER_EMAIL = ''
process.env.POE_API_KEY = process.env.POE_API_KEY || 'test-poe-key'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'crm-experta-secreto-temporal'
