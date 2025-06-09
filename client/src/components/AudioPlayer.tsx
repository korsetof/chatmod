import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { MediaItem } from '@shared/schema';
import { formatDistance } from 'date-fns';

interface AudioPlayerProps {
  initialTrack?: MediaItem;
  playlist?: MediaItem[];
  autoPlay?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ initialTrack, playlist = [], autoPlay = false }) => {
  const [currentTrack, setCurrentTrack] = useState<MediaItem | null>(initialTrack || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // If no playlist is provided, fetch public audio files
  const { data: publicMedia } = useQuery({
    queryKey: ['/api/media/public'],
    enabled: playlist.length === 0,
  });
  
  // Combine provided playlist with public media if available
  const fullPlaylist = playlist.length > 0 
    ? playlist
    : (Array.isArray(publicMedia) ? publicMedia.filter(item => item.type === 'audio') : []);
  
  useEffect(() => {
    // Set initial track if not already set and playlist has items
    if (!currentTrack && fullPlaylist.length > 0) {
      setCurrentTrack(fullPlaylist[0]);
    }
  }, [fullPlaylist, currentTrack]);
  
  useEffect(() => {
    if (autoPlay && currentTrack) {
      handlePlay();
    }
  }, [currentTrack, autoPlay]);
  
  const handleLoadStart = () => {
    setIsLoading(true);
  };
  
  const handleCanPlay = () => {
    setIsLoading(false);
    if (isPlaying) {
      audioRef.current?.play();
    }
  };
  
  const handleLoadMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };
  
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };
  
  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };
  
  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };
  
  const togglePlay = () => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };
  
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };
  
  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };
  
  const handleSeek = (value: number[]) => {
    const seekTime = value[0];
    setCurrentTime(seekTime);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
  };
  
  const handleEnded = () => {
    if (isLooping) {
      // If looping, restart the same track
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      // Otherwise, play the next track
      playNextTrack();
    }
  };
  
  const playPreviousTrack = () => {
    if (fullPlaylist.length === 0 || !currentTrack) return;
    
    const currentIndex = fullPlaylist.findIndex(track => track.id === currentTrack.id);
    const previousIndex = currentIndex === 0 ? fullPlaylist.length - 1 : currentIndex - 1;
    setCurrentTrack(fullPlaylist[previousIndex]);
  };
  
  const playNextTrack = () => {
    if (fullPlaylist.length === 0 || !currentTrack) return;
    
    const currentIndex = fullPlaylist.findIndex(track => track.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % fullPlaylist.length;
    setCurrentTrack(fullPlaylist[nextIndex]);
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        {/* Audio element (hidden) */}
        <audio
          ref={audioRef}
          src={currentTrack?.url || undefined}
          onTimeUpdate={handleTimeUpdate}
          onLoadStart={handleLoadStart}
          onCanPlay={handleCanPlay}
          onLoadedMetadata={handleLoadMetadata}
          onEnded={handleEnded}
          preload="metadata"
        />
        
        {currentTrack ? (
          <>
            {/* Track info */}
            <div className="mb-4 flex items-center">
              <div className="flex-1">
                <h3 className="font-semibold truncate">{currentTrack.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {formatDistance(
                    new Date(currentTrack.createdAt ?? 0),
                    new Date(),
                    { addSuffix: true }
                  )}
                </p>
              </div>
              <Badge variant="secondary" className="ml-2">
                {currentTrack.type}
              </Badge>
            </div>
            
            {/* Time and progress */}
            <div className="space-y-2">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={handleSeek}
                disabled={isLoading}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsLooping(!isLooping)}
                  className={isLooping ? 'text-primary' : ''}
                >
                  <Repeat className="h-5 w-5" />
                </Button>
                
                <Button variant="ghost" size="icon" onClick={toggleMute}>
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
                
                <div className="w-20 mx-2">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={playPreviousTrack}
                  disabled={fullPlaylist.length <= 1}
                >
                  <SkipBack className="h-5 w-5" />
                </Button>
                
                <Button
                  variant="default"
                  size="icon"
                  className="h-10 w-10"
                  onClick={togglePlay}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="loading h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={playNextTrack}
                  disabled={fullPlaylist.length <= 1}
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="w-[88px]"></div> {/* Spacer to balance the layout */}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground">No audio tracks available</p>
          </div>
        )}
        
        {/* Mini Playlist */}
        {fullPlaylist.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-2">Playlist</h4>
            <div className="max-h-48 overflow-y-auto pr-2">
              {fullPlaylist.map((track) => (
                <div
                  key={track.id}
                  className={`p-2 rounded-md flex items-center hover:bg-accent/50 cursor-pointer mb-1 ${
                    currentTrack?.id === track.id ? 'bg-accent/80' : ''
                  }`}
                  onClick={() => setCurrentTrack(track)}
                >
                  <div className="bg-primary/10 p-2 rounded-md mr-2">
                    {currentTrack?.id === track.id && isPlaying ? (
                      <Pause className="h-4 w-4 text-primary" />
                    ) : (
                      <Play className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{track.title}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(track.duration || 0)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AudioPlayer;
