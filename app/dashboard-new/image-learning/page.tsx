"use client";

import dynamic from "next/dynamic";

const ImageVocabularyLearning = dynamic(
  () => import("@/components/ImageVocabularyLearning"),
  { ssr: false }
);

export default function ImageLearningPage() {
  return <ImageVocabularyLearning />;
}
