"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileHistoryProps {
  userId: string;
}

interface HistoryItem {
  id: string;
  type: string;
  title: string;
  date: string;
  score?: number;
}

export default function ProfileHistory({ userId }: ProfileHistoryProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user history
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/user-progress?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history || []);
        }
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Learning History</h1>
      
      {history.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No learning history yet. Start learning to see your progress!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{item.type}</span>
                  <span>{item.date}</span>
                  {item.score !== undefined && (
                    <span className="font-medium text-primary">
                      Score: {item.score}%
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
