import { useCallback } from 'react'
import { useAppDispatch } from '../../store/hooks'
import { addMessage as addMessageToStore } from '../../store/slices/chatSlice'
import { navigateToTab } from '../../store/slices/navigationSlice'
import { TabKey } from '../../models/navigation'
import { bioFilesApi } from '../../api/bioFilesApi'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function useFileUpload() {
  const dispatch = useAppDispatch()

  const handleFileUpload = useCallback(async (accept?: string, multiple?: boolean) => {
    console.log('[InteractiveChat] File upload triggered', { accept, multiple })

    const input = document.createElement('input')
    input.type = 'file'
    if (accept) input.accept = accept
    if (multiple) input.multiple = multiple

    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files
      if (!files || files.length === 0) return

      const fileArray = Array.from(files)

      try {
        const uploadingMessage: Message = {
          role: 'assistant',
          content: `Uploading ${fileArray.length} file${fileArray.length > 1 ? 's' : ''}: ${fileArray.map(f => f.name).join(', ')}...`
        }
        dispatch(addMessageToStore({ message: uploadingMessage, markAsRead: true }))

        const uploadResults = await Promise.all(
          fileArray.map(async (file) => {
            try {
              const result = await bioFilesApi.uploadFile(file)
              return { success: true, file, result }
            } catch (error) {
              console.error('[InteractiveChat] Error uploading file:', file.name, error)
              return { success: false, file, error }
            }
          })
        )

        const successful = uploadResults.filter(r => r.success)
        const failed = uploadResults.filter(r => !r.success)

        let resultContent = ''
        if (successful.length > 0) {
          resultContent += `**Successfully uploaded ${successful.length} file${successful.length > 1 ? 's' : ''}:**\n`
          successful.forEach(r => {
            if (r.success && r.result) {
              resultContent += `- ${r.file.name} (${r.result.sizeFormatted})\n`
            }
          })
        }

        if (failed.length > 0) {
          resultContent += `\n**Failed to upload ${failed.length} file${failed.length > 1 ? 's' : ''}:**\n`
          failed.forEach(r => {
            if (!r.success) {
              const errorMsg = r.error instanceof Error ? r.error.message : 'Unknown error'
              resultContent += `- ${r.file.name}: ${errorMsg}\n`
            }
          })
        }

        if (successful.length > 0) {
          resultContent += `\nYour files are now stored in the Bio section.`
        }

        dispatch(addMessageToStore({ message: { role: 'assistant', content: resultContent }, markAsRead: true }))

        if (successful.length > 0) {
          setTimeout(() => dispatch(navigateToTab(TabKey.BIO)), 1000)
        }
      } catch (error) {
        console.error('[InteractiveChat] Error during file upload:', error)
        dispatch(addMessageToStore({
          message: { role: 'assistant', content: `**Upload failed:** ${error instanceof Error ? error.message : 'Unknown error occurred'}` },
          markAsRead: true,
        }))
      }
    }

    input.click()
  }, [dispatch])

  return handleFileUpload
}
