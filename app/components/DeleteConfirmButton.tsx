// app/components/DeleteConfirmButton.tsx
'use client'

export default function DeleteConfirmButton({ 
  className, 
  label = "刪除" 
}: { 
  className?: string, 
  label?: string 
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        // 瀏覽器專用嘅確認視窗，如果撳取消，就終止提交表單
        if (!window.confirm('確定要永久刪除此清單及其所有內容嗎？')) {
          e.preventDefault();
        }
      }}
    >
      {label}
    </button>
  )
}