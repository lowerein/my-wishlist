// app/components/DeleteConfirmButton.tsx
'use client'

export default function DeleteConfirmButton({ 
  className, 
  label = "刪除",
  confirmMessage = "確定要永久刪除此項目嗎？" // <--- 加入自訂訊息 Prop
}: { 
  className?: string, 
  label?: string,
  confirmMessage?: string
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        // 使用傳入嘅 confirmMessage
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {label}
    </button>
  )
}