# 📚 Vocabulary Analysis Integration Guide

## Overview

This guide shows how to integrate STAGE 11 (Knowledge Graph) and STAGE 12 (Flashcards) visualization into the existing document upload flow.

---

## 🎯 Goal

After a user uploads a document in `/dashboard-new/documents`, they should be able to:
1. See vocabulary extracted
2. View Knowledge Graph visualization
3. Study Flashcards grouped by topic

---

## 🔧 Implementation Options

### Option 1: Add Button to FileUploadOCR (Recommended)

Modify `components/FileUploadOCR.tsx` to add a "View Analysis" button after successful upload.

#### Step 1: Add State for Document ID

```tsx
// In FileUploadOCR component
const [lastDocumentId, setLastDocumentId] = useState<string | null>(null);
```

#### Step 2: Store Document ID After Upload

In the `handleUpload` function, after successful upload:

```tsx
// After pipeline processing completes
const documentId = `doc_${timestamp}`;
setLastDocumentId(documentId);
```

#### Step 3: Add "View Analysis" Button

In the review step, add a button:

```tsx
{step === "review" && ocrResult && (
  <div className="flex gap-3">
    <button 
      onClick={() => router.push(`/dashboard-new/vocabulary-analysis?doc=${lastDocumentId}`)}
      className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2"
    >
      <Brain className="w-5 h-5" />
      View Knowledge Graph
    </button>
    
    <button 
      onClick={generateFlashcards}
      className="px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700"
    >
      Generate Flashcards
    </button>
  </div>
)}
```

---

### Option 2: Automatic Redirect After Upload

Automatically redirect to vocabulary analysis page after upload completes.

#### In handleUpload function:

```tsx
// After successful upload
setLastDocumentId(documentId);

// Redirect after 2 seconds
setTimeout(() => {
  router.push(`/dashboard-new/vocabulary-analysis?doc=${documentId}`);
}, 2000);
```

---

### Option 3: Add Tab to Documents Page

Create a tabbed interface in the documents page.

#### Modify `app/dashboard-new/documents/page.tsx`:

```tsx
"use client"

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import FileUploadOCR from '@/components/FileUploadOCR'
import KnowledgeGraphViewer from '@/components/KnowledgeGraphViewer'
import FlashcardClusterView from '@/components/FlashcardClusterView'

export default function DocumentsPage() {
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null)

  return (
    <div className="container mx-auto p-6">
      <Tabs defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload">Upload Document</TabsTrigger>
          <TabsTrigger value="analysis" disabled={!activeDocumentId}>
            Knowledge Graph
          </TabsTrigger>
          <TabsTrigger value="flashcards" disabled={!activeDocumentId}>
            Flashcards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <FileUploadOCR onUploadComplete={setActiveDocumentId} />
        </TabsContent>

        <TabsContent value="analysis">
          {activeDocumentId && (
            <KnowledgeGraphViewer documentId={activeDocumentId} />
          )}
        </TabsContent>

        <TabsContent value="flashcards">
          {activeDocumentId && (
            <FlashcardClusterView documentId={activeDocumentId} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

#### Update FileUploadOCR to accept callback:

```tsx
interface FileUploadOCRProps {
  onUploadComplete?: (documentId: string) => void;
}

export default function FileUploadOCR({ onUploadComplete }: FileUploadOCRProps) {
  // ... existing code ...

  const handleUpload = async () => {
    // ... existing upload logic ...
    
    // After successful upload
    const documentId = `doc_${timestamp}`;
    
    // Call callback if provided
    if (onUploadComplete) {
      onUploadComplete(documentId);
    }
  }
}
```

---

## 🎨 UI/UX Recommendations

### 1. Progress Indicator

Show users that analysis is happening:

```tsx
{isProcessing && (
  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
    <div className="flex items-center gap-4">
      <Loader className="w-6 h-6 animate-spin text-blue-600" />
      <div>
        <h3 className="font-bold text-blue-900">Analyzing Document...</h3>
        <p className="text-blue-700">Building knowledge graph and generating flashcards</p>
      </div>
    </div>
  </div>
)}
```

### 2. Success Message with Actions

After upload completes:

```tsx
<div className="bg-green-50 border border-green-200 rounded-xl p-6">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      <CheckCircle className="w-8 h-8 text-green-600" />
      <div>
        <h3 className="font-bold text-green-900">Upload Complete!</h3>
        <p className="text-green-700">
          Extracted {vocabularyCount} vocabulary items
        </p>
      </div>
    </div>
    
    <div className="flex gap-3">
      <button 
        onClick={() => viewKnowledgeGraph()}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        📊 View Knowledge Graph
      </button>
      
      <button 
        onClick={() => studyFlashcards()}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
      >
        🎴 Study Flashcards
      </button>
    </div>
  </div>
</div>
```

### 3. Document History with Analysis Links

Show previously uploaded documents with quick access to analysis:

```tsx
{uploadedDocuments.map(doc => (
  <div key={doc._id} className="flex items-center justify-between p-4 bg-white rounded-xl">
    <div>
      <h4 className="font-semibold">{doc.fileName}</h4>
      <p className="text-sm text-gray-500">{formatDate(doc.uploadDate)}</p>
    </div>
    
    <div className="flex gap-2">
      <button 
        onClick={() => viewAnalysis(doc.documentId)}
        className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
      >
        📊 Analysis
      </button>
      
      <button 
        onClick={() => studyFlashcards(doc.documentId)}
        className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
      >
        🎴 Flashcards
      </button>
    </div>
  </div>
))}
```

---

## 🔄 Data Flow

```
1. User uploads document
   ↓
2. Frontend sends to Python API (/api/upload-document-complete)
   ↓
3. Python API processes through 12-stage pipeline
   ↓
4. Python API stores result in cache
   ↓
5. Python API returns document_id + vocabulary
   ↓
6. Frontend stores document_id
   ↓
7. User clicks "View Analysis"
   ↓
8. Frontend fetches from /api/knowledge-graph/{document_id}
   ↓
9. Frontend displays Knowledge Graph visualization
   ↓
10. User clicks "Study Flashcards"
    ↓
11. Frontend fetches from /api/flashcards/{document_id}
    ↓
12. Frontend displays Flashcards grouped by cluster
```

---

## 🧪 Testing Checklist

- [ ] Upload document successfully
- [ ] Document ID is captured
- [ ] "View Analysis" button appears
- [ ] Clicking button navigates to analysis page
- [ ] Knowledge Graph loads and displays
- [ ] Flashcards load and display
- [ ] Audio playback works
- [ ] Synonyms are grouped correctly
- [ ] Related words are shown
- [ ] Clusters are color-coded
- [ ] Mind map renders correctly

---

## 🐛 Common Issues

### Issue: "Document not found"

**Cause**: Document ID not stored in cache

**Solution**: Ensure `store_pipeline_result()` is called in Python API after processing

### Issue: Knowledge Graph not loading

**Cause**: STAGE 11 not enabled or failed

**Solution**: Check Python API logs, ensure `generate_flashcards=True` in upload request

### Issue: Flashcards empty

**Cause**: STAGE 12 not generating flashcards

**Solution**: Check Python API logs, verify IPA library is installed

### Issue: CORS error

**Cause**: Python API not allowing frontend origin

**Solution**: Check CORS configuration in `main.py`, ensure `allow_origins=["*"]`

---

## 📝 Example Implementation

Here's a complete example of Option 1 (Add Button):

```tsx
// components/FileUploadOCR.tsx

import { useRouter } from 'next/navigation'
import { Brain, BookOpen } from 'lucide-react'

export default function FileUploadOCR() {
  const router = useRouter()
  const [lastDocumentId, setLastDocumentId] = useState<string | null>(null)
  
  const handleUpload = async () => {
    // ... existing upload logic ...
    
    const documentId = `doc_${timestamp}`
    setLastDocumentId(documentId)
    
    // ... rest of upload logic ...
  }
  
  return (
    <div>
      {/* ... existing upload UI ... */}
      
      {step === "review" && ocrResult && lastDocumentId && (
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            🎉 Document Processed Successfully!
          </h3>
          
          <p className="text-gray-700 mb-4">
            Your document has been analyzed. You can now:
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/dashboard-new/vocabulary-analysis?doc=${lastDocumentId}`)}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              <Brain className="w-5 h-5" />
              View Knowledge Graph
            </button>
            
            <button
              onClick={generateFlashcards}
              disabled={selectedWords.length === 0 || isGenerating}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <BookOpen className="w-5 h-5" />
              {isGenerating ? 'Generating...' : `Generate ${selectedWords.length} Flashcards`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## 🎯 Next Steps

1. Choose implementation option (1, 2, or 3)
2. Modify `FileUploadOCR.tsx` accordingly
3. Test upload flow
4. Test navigation to analysis page
5. Verify data loads correctly
6. Add error handling
7. Add loading states
8. Deploy to production

---

**Author**: Kiro AI  
**Date**: 2026-02-10  
**Version**: 5.2.0
