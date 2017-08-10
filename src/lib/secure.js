import crypto from 'crypto';

const secret = 'abcdefg';

const encrypt = value => crypto.createHmac('sha256', secret)
  .update(value)
  .digest('hex');

export default encrypt;
