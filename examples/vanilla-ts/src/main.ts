import './style.css'
import { tx } from './client'
import { initLayout } from './layout'
import { initLogger } from './utils/logger'
import { initRouter, navigate } from './router'

initLayout()
initLogger()
initRouter()

document.querySelector('#header-logout-btn')?.addEventListener('click', async () => {
    await tx.auth.logoutAll()
    navigate('/login')
})
