import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, CheckCircle, Circle, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  userVotes: string[];
}

interface Poll {
  id: string;
  question: string;
  allowMultiple: boolean;
  is_active: boolean;
  options: PollOption[];
}

interface PollComponentProps {
  messageId: string;
  pollData: Poll;
  createdAt: string;
  userName: string;
  userTitle?: string;
  isOwnMessage: boolean;
}

export default function PollComponent({ messageId, pollData, createdAt, userName, userTitle, isOwnMessage }: PollComponentProps) {
  const { user } = useAuth() as { user: { id: string; name: string } | undefined };
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showResults, setShowResults] = useState(false);

  // Get updated poll data
  const { data: currentPoll } = useQuery({
    queryKey: ["/api/polls", pollData.id],
    initialData: pollData,
    refetchInterval: 3000, // Auto-refresh every 3 seconds
  }) as { data: Poll };

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async (optionId: string) => {
      return await apiRequest(`/api/polls/${pollData.id}/vote`, 'POST', { optionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls", pollData.id] });
      toast({
        title: "Vote recorded",
        description: "Your vote has been saved",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record vote",
        variant: "destructive",
      });
    },
  });

  // Remove vote mutation
  const removeVoteMutation = useMutation({
    mutationFn: async (optionId: string) => {
      return await apiRequest(`/api/polls/${pollData.id}/vote/${optionId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls", pollData.id] });
      toast({
        title: "Vote removed",
        description: "Your vote has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove vote",
        variant: "destructive",
      });
    },
  });

  const handleVote = (optionId: string) => {
    const hasVoted = currentPoll.options.find(opt => opt.id === optionId)?.userVotes.includes(user?.id || '');
    
    if (hasVoted) {
      removeVoteMutation.mutate(optionId);
    } else {
      voteMutation.mutate(optionId);
    }
  };

  const getTotalVotes = () => {
    return currentPoll.options.reduce((total, option) => total + option.voteCount, 0);
  };

  const hasUserVoted = () => {
    return currentPoll.options.some(option => option.userVotes.includes(user?.id || ''));
  };

  const getVotePercentage = (voteCount: number) => {
    const total = getTotalVotes();
    return total === 0 ? 0 : Math.round((voteCount / total) * 100);
  };

  const totalVotes = getTotalVotes();
  const userHasVoted = hasUserVoted();

  return (
    <Card className={cn(
      "max-w-md",
      isOwnMessage ? "ml-auto bg-blue-50 dark:bg-blue-900/20" : "bg-white dark:bg-gray-800"
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-gray-500">Poll</span>
          </div>
          <div className="text-xs text-gray-500">
            {userName} {userTitle && `(${userTitle})`}
          </div>
        </div>

        {/* Question */}
        <div className="font-medium text-gray-900 dark:text-gray-100">
          {currentPoll.question}
        </div>

        {/* Selection type indicator */}
        <div className="text-xs text-gray-500">
          {currentPoll.allowMultiple ? "Select one or more" : "Select one option"}
        </div>

        {/* Options */}
        <div className="space-y-2">
          {currentPoll.options.map((option) => {
            const hasVoted = option.userVotes.includes(user?.id || '');
            const percentage = getVotePercentage(option.voteCount);
            
            return (
              <div key={option.id} className="relative">
                <Button
                  variant="ghost"
                  onClick={() => handleVote(option.id)}
                  disabled={voteMutation.isPending || removeVoteMutation.isPending || !currentPoll.is_active}
                  className={cn(
                    "w-full justify-start h-auto p-3 relative overflow-hidden",
                    hasVoted && "bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  )}
                >
                  {/* Progress bar background */}
                  {(showResults || userHasVoted) && (
                    <div 
                      className="absolute left-0 top-0 h-full bg-gray-100 dark:bg-gray-700 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  )}
                  
                  {/* Content */}
                  <div className="flex items-center justify-between w-full relative z-10">
                    <div className="flex items-center space-x-3">
                      {hasVoted ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400" />
                      )}
                      <span className="text-sm font-medium">{option.text}</span>
                    </div>
                    
                    {(showResults || userHasVoted) && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {option.voteCount}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {percentage}%
                        </Badge>
                      </div>
                    )}
                  </div>
                </Button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500">
            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResults(!showResults)}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              <Eye className="w-3 h-3 mr-1" />
              {showResults ? 'Hide' : 'View'} results
            </Button>
            
            <div className="text-xs text-gray-500">
              {new Date(createdAt).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}