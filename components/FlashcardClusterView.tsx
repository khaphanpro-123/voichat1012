"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Volume2, 
  BookOpen, 
  Star, 
  ChevronDown, 
  ChevronUp,
  Download,
  Grid,
  List
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface Flashcard {
  id: string
  word: string
  synonyms: Array<{
    word: string
    similarity: number
  }>
  cluster_id: number
  cluster_name: string
  cluster_rank: number
  semantic_role: string
  importance_score: number
  meaning: string
  example: string
  ipa: string
  audio_word_url: string
  audio_example_url: string
  word_type: string
  difficulty: string
  tags: string[]
  related_words: Array<{
    word: string
    similarity: number
  }>
}

interface ClusterGroup {
  cluster_id: number
  cluster_name: string
  flashcard_count: number
  flashcards: Flashcard[]
}

interface FlashcardData {
  document_id: string
  document_title: string
  grouped_by_cluster: boolean
  clusters: ClusterGroup[]
  total_flashcards: number
  total_clusters: number
}

interface Props {
  documentId: string
}

export default function FlashcardClusterView({ documentId }: Props) {
  const [data, setData] = useState<FlashcardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchFlashcards()
  }, [documentId])

  const fetchFlashcards = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `http://localhost:8000/api/flashcards/${documentId}?group_by_cluster=true`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch flashcards')
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const playAudio = (url: string) => {
    const audio = new Audio(url)
    audio.play().catch(err => console.error('Audio playback failed:', err))
  }

  const toggleCard = (cardId: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId)
    } else {
      newExpanded.add(cardId)
    }
    setExpandedCards(newExpanded)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'core': return '🎯'
      case 'umbrella': return '📂'
      default: return '📄'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 animate-pulse text-blue-500" />
              <p className="text-muted-foreground">Loading flashcards...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <p>Error: {error || 'No data available'}</p>
            <Button onClick={fetchFlashcards} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Flashcards by Cluster</CardTitle>
              <CardDescription>{data.document_title}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="font-semibold">{data.total_flashcards}</span> flashcards
            </div>
            <div>
              <span className="font-semibold">{data.total_clusters}</span> clusters
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clusters */}
      <Accordion type="multiple" className="space-y-4">
        {data.clusters.map((cluster) => (
          <AccordionItem key={cluster.cluster_id} value={`cluster-${cluster.cluster_id}`}>
            <Card>
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{getRoleIcon('core')}</div>
                    <div className="text-left">
                      <h3 className="font-semibold text-lg">{cluster.cluster_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {cluster.flashcard_count} flashcards
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{cluster.cluster_id + 1}</Badge>
                </div>
              </AccordionTrigger>
              
              <AccordionContent>
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4 p-6' : 'space-y-4 p-6'}>
                  {cluster.flashcards.map((card) => (
                    <Card key={card.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl">{getRoleIcon(card.semantic_role)}</span>
                              <CardTitle className="text-xl">{card.word}</CardTitle>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => playAudio(card.audio_word_url)}
                              >
                                <Volume2 className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            {/* IPA */}
                            {card.ipa && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {card.ipa}
                              </p>
                            )}

                            {/* Synonyms */}
                            {card.synonyms.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                <span className="text-xs text-muted-foreground">Synonyms:</span>
                                {card.synonyms.map((syn, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {syn.word}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1">
                              <Badge className={getDifficultyColor(card.difficulty)}>
                                {card.difficulty}
                              </Badge>
                              <Badge variant="outline">{card.word_type}</Badge>
                              <Badge variant="secondary">
                                <Star className="w-3 h-3 mr-1" />
                                {card.importance_score.toFixed(2)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent>
                        {/* Meaning */}
                        <div className="mb-3">
                          <p className="text-sm font-semibold mb-1">Meaning:</p>
                          <p className="text-sm">{card.meaning}</p>
                        </div>

                        {/* Example */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold">Example:</p>
                            {card.audio_example_url && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => playAudio(card.audio_example_url)}
                              >
                                <Volume2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground italic">
                            {card.example}
                          </p>
                        </div>

                        {/* Related Words */}
                        {card.related_words.length > 0 && (
                          <div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-between p-0 h-auto"
                              onClick={() => toggleCard(card.id)}
                            >
                              <span className="text-xs font-semibold">
                                Related Words ({card.related_words.length})
                              </span>
                              {expandedCards.has(card.id) ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </Button>
                            
                            {expandedCards.has(card.id) && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {card.related_words.map((rel, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {rel.word} ({rel.similarity.toFixed(2)})
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
