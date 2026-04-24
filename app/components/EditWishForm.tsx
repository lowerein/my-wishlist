// app/components/EditWishForm.tsx
'use client'
import { useState } from 'react'
import { updateWish } from '../actions'

export default function EditWishForm({ wish, listId, categoryOptions }: { wish: any, listId: string, categoryOptions: string[] }) {
  const [isEditing, setIsEditing] = useState(false)

  if (!isEditing) {
    return (
      <button 
        onClick={() => setIsEditing(true)}
        className="text-[12px] bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 transition hover:bg-gray-200"
      >
        ✏️ 編輯
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md p-6 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-bold mb-4">編輯項目</h2>
        
        <form action={async (formData) => {
          await updateWish(formData);
          setIsEditing(false);
        }} className="space-y-4">
          <input type="hidden" name="wishId" value={wish.id} />
          <input type="hidden" name="listId" value={listId} />

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">類別</label>
            <select name="category" defaultValue={wish.category} className="w-full p-2 border rounded-md dark:bg-gray-800 text-sm">
              {categoryOptions.map(cat => <option key={cat} value={cat.trim()}>{cat.trim()}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">標題</label>
            <input name="description" defaultValue={wish.description} required className="w-full p-2 border rounded-md dark:bg-gray-800 text-sm" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">詳細描述 (Optional)</label>
            <textarea name="notes" defaultValue={wish.notes || ''} rows={3} className="w-full p-2 border rounded-md dark:bg-gray-800 text-sm" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">連結 (Optional)</label>
            <input name="link" type="url" defaultValue={wish.link || ''} className="w-full p-2 border rounded-md dark:bg-gray-800 text-sm" />
          </div>

          <div className="flex items-center gap-2 py-2">
            <input type="checkbox" id={`edit-private-${wish.id}`} name="isPrivate" defaultChecked={wish.isPrivate} className="w-4 h-4" />
            <label htmlFor={`edit-private-${wish.id}`} className="text-xs font-medium">🔒 設為私人</label>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold">儲存修改</button>
            <button type="button" onClick={() => setIsEditing(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 py-2 rounded-lg font-bold">取消</button>
          </div>
        </form>
      </div>
    </div>
  )
}