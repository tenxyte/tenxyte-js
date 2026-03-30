import './style.css'
import { tx } from './client'
import { initLayout } from './layout'
import { initRouter, navigate } from './router'

initLayout()
initRouter()

tx.on('session:expired', () => navigate('/login'))

document.querySelector('#header-logout-btn')?.addEventListener('click', async () => {
    await tx.auth.logoutAll()
    navigate('/login')
})
