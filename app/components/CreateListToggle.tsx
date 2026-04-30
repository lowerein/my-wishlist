// app/components/CreateListToggle.tsx
'use client'
import { useState } from 'react'
import { createList } from '../actions'

export default function CreateListToggle() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* 獨立嘅觸發按鈕 */}
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition flex items-center gap-2 shadow-sm shadow-blue-500/30"
      >
        <span className="text-lg leading-none">＋</span> 建立新清單
      </button>

      {/* 彈出視窗 Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md p-6 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800">
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-blue-700 dark:text-blue-300">🆕 建立新清單</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            
            <form action={async (formData) => {
              await createList(formData);
              setIsOpen(false);
            }} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">清單名稱</label>
                <input 
                  name="title" 
                  required 
                  placeholder="例如: 公司聚餐" 
                  className="w-full p-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">簡單描述 (Optional)</label>
                <input 
                  name="description" 
                  placeholder="描述此清單用途..." 
                  className="w-full p-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition">
                  立即建立
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-bold text-sm transition"
                >
                  取消
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  )
}