require('dotenv').config();
const { Pool } = require('pg');
const { randomBytes, scryptSync } = require('crypto');

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

const customers = Array.from({length:10}, (_,i)=>({name:`Pelanggan ${i+1}`, email:`c${i+1}@mail.com`, phone:`0812-0000-00${(i+1).toString().padStart(2,'0')}`}));
const menus = [
  "Mie Ayam Original","Mie Ayam Bakso","Mie Ayam Pangsit","Bakso Urat","Bakso Telor",
  "Nasi Goreng","Nasi Goreng Spesial","Es Teh","Es Jeruk","Kopi Hitam"
].map((n,i)=>({name:n, price: (i+1)*5000}));

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pool.query(
    "INSERT INTO users (name,email,password,role) VALUES ($1,$2,$3,'OWNER') ON CONFLICT (email) DO NOTHING",
    ["Owner", "owner@padsi.com", hashPassword("owner123")]
  );
  await pool.query(
    "INSERT INTO users (name,email,password,role) VALUES ($1,$2,$3,'PEGAWAI') ON CONFLICT (email) DO NOTHING",
    ["Pegawai", "pegawai@padsi.com", hashPassword("pegawai123")]
  );

  for (const c of customers) {
    await pool.query("INSERT INTO customers (name,email,phone) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [c.name,c.email,c.phone]);
  }
  for (const m of menus) {
    await pool.query("INSERT INTO menus (name,price) VALUES ($1,$2) ON CONFLICT DO NOTHING", [m.name,m.price]);
  }
  for (let i=1;i<=10;i++) {
    await pool.query("INSERT INTO favorites (customer_id,menu_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [i, ((i-1)%10)+1]);
  }
  for (let i=1;i<=10;i++) {
    const spend = (i*10000);
    const pts = Math.floor(spend/1000);
    await pool.query("INSERT INTO visits (customer_id,total_spend,earned_pts) VALUES ($1,$2,$3)", [i, spend, pts]);
    await pool.query("UPDATE customers SET total_visits = total_visits + 1, points = points + $1 WHERE id=$2", [pts, i]);
  }
  for (let i=1;i<=10;i++) {
    const type = i%3===0 ? 'REDEEM' : 'EARN';
    const pts = i*5;
    await pool.query("INSERT INTO rewards (customer_id,type,points,note) VALUES ($1,$2,$3,$4)", [((i-1)%10)+1, type, pts, type==='EARN'?'Bonus promo':'Penukaran']);
    if (type==='EARN') {
      await pool.query("UPDATE customers SET points = points + $1 WHERE id=$2", [pts, ((i-1)%10)+1]);
    } else {
      await pool.query("UPDATE customers SET points = GREATEST(points - $1,0) WHERE id=$2", [pts, ((i-1)%10)+1]);
    }
  }

  await pool.end();
  console.log("Seed done.");
}
main().catch(e => { console.error(e); process.exit(1); });
