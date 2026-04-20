// 공통 레이아웃 — 헤더 + 사이드바 + 콘텐츠 영역
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header onMenuToggle={() => setSidebarOpen(prev => !prev)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* 메인 콘텐츠 — 사이드바 너비(256px) + 상단 헤더(56px) 만큼 오프셋 */}
      <main className="pt-14 lg:pl-64 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default AppLayout
