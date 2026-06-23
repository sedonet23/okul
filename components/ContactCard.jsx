import { callPhone } from '../utils/phone'
import { openWhatsApp } from '../utils/whatsapp'

export default function ContactCard({ name, phone }) {
  return (
    <div style={{border:'1px solid #ddd',padding:12,marginBottom:10}}>
      <h4>{name}</h4>
      <div style={{display:'flex',gap:10}}>
        <button onClick={() => callPhone(phone)}>📞 Ara</button>
        <button onClick={() => openWhatsApp(phone, name + ' için bilgi')}>💬 WhatsApp</button>
      </div>
    </div>
  )
}
