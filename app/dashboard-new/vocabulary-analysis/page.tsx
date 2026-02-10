import KnowledgeGraphViewer from '@/components/KnowledgeGraphViewer'
import FlashcardClusterView from '@/components/FlashcardClusterView'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function VocabularyAnalysisPage() {
  // TODO: Get document ID from URL params or state
  const documentId = "doc_test_complete"

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Vocabulary Analysis</h1>
        <p className="text-muted-foreground">
          Explore vocabulary relationships and study with flashcards
        </p>
      </div>

      <Tabs defaultValue="flashcards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
          <TabsTrigger value="knowledge-graph">Knowledge Graph</TabsTrigger>
        </TabsList>

        <TabsContent value="flashcards">
          <FlashcardClusterView documentId={documentId} />
        </TabsContent>

        <TabsContent value="knowledge-graph">
          <KnowledgeGraphViewer documentId={documentId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
