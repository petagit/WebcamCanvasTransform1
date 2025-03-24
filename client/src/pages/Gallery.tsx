import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, ArrowLeft, Trash2, Download, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { downloadAsJpg, downloadAsVideo } from '../utils/file-utils';
import { useAuth } from '../hooks/use-auth';
import { Link } from 'wouter';

type MediaItem = {
  id: number;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  timestamp: string;
  userId: number;
};

export default function Gallery() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'images' | 'videos'>('all');

  const { data: mediaItems = [], isLoading, refetch } = useQuery<MediaItem[]>({
    queryKey: ['/api/media'],
    enabled: !!user,
  });

  const filteredMedia = mediaItems.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'images') return item.mediaType === 'image';
    if (activeTab === 'videos') return item.mediaType === 'video';
    return true;
  });

  const handleDownload = (item: MediaItem) => {
    if (item.mediaType === 'image') {
      downloadAsJpg(item.mediaUrl, `pixelcam-image-${item.id}`);
    } else if (item.mediaType === 'video') {
      downloadAsVideo(item.mediaUrl, `pixelcam-video-${item.id}`);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/media/${id}`, {
        method: 'DELETE',
      });
      
      toast({
        title: 'Media deleted',
        description: 'The selected media has been removed from your gallery',
      });
      
      // Close detail view if the deleted item was selected
      if (selectedMedia?.id === id) {
        setSelectedMedia(null);
      }
      
      // Refresh the gallery
      refetch();
    } catch (error) {
      console.error('Error deleting media:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete the media',
        variant: 'destructive',
      });
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-6 p-6">
        <h1 className="text-4xl font-bold">Gallery Access</h1>
        <p className="text-xl text-muted-foreground">Please log in to view your gallery</p>
        <Button asChild>
          <Link href="/auth">Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-6 mx-auto">
      <div className="flex items-center mb-6">
        <Button variant="ghost" asChild className="mr-4">
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Camera
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">My Gallery</h1>
      </div>

      <Tabs defaultValue="all" className="w-full" value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
          </TabsList>
          <div className="text-sm text-muted-foreground">
            {filteredMedia.length} {filteredMedia.length === 1 ? 'item' : 'items'}
          </div>
        </div>

        <TabsContent value="all" className="mt-0">
          <GalleryGrid 
            items={filteredMedia}
            isLoading={isLoading}
            onSelect={setSelectedMedia}
            onDelete={handleDelete}
            onDownload={handleDownload}
          />
        </TabsContent>
        
        <TabsContent value="images" className="mt-0">
          <GalleryGrid 
            items={filteredMedia}
            isLoading={isLoading}
            onSelect={setSelectedMedia}
            onDelete={handleDelete}
            onDownload={handleDownload}
          />
        </TabsContent>
        
        <TabsContent value="videos" className="mt-0">
          <GalleryGrid 
            items={filteredMedia}
            isLoading={isLoading}
            onSelect={setSelectedMedia}
            onDelete={handleDelete}
            onDownload={handleDownload}
          />
        </TabsContent>
      </Tabs>

      {/* Media Detail Modal */}
      <Dialog open={!!selectedMedia} onOpenChange={(open) => !open && setSelectedMedia(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden sm:rounded-lg">
          <div className="flex flex-col md:flex-row">
            <div className="relative md:w-3/4 bg-black">
              {selectedMedia?.mediaType === 'image' && (
                <img 
                  src={selectedMedia.mediaUrl} 
                  alt="Selected media"
                  className="object-contain w-full h-[50vh] md:h-[70vh]" 
                />
              )}
              {selectedMedia?.mediaType === 'video' && (
                <video 
                  src={selectedMedia.mediaUrl} 
                  controls
                  className="object-contain w-full h-[50vh] md:h-[70vh]" 
                />
              )}
            </div>
            <div className="flex flex-col p-4 md:w-1/4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {selectedMedia?.mediaType === 'image' ? 'Image' : 'Video'} Details
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setSelectedMedia(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Separator className="my-3" />
              <div className="flex-1 space-y-4">
                <div>
                  <h4 className="mb-1 text-sm font-semibold text-muted-foreground">Created</h4>
                  <p>{selectedMedia ? formatDistanceToNow(new Date(selectedMedia.timestamp), { addSuffix: true }) : ''}</p>
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-semibold text-muted-foreground">Type</h4>
                  <p className="capitalize">{selectedMedia?.mediaType}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => selectedMedia && handleDownload(selectedMedia)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => selectedMedia && handleDelete(selectedMedia.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface GalleryGridProps {
  items: MediaItem[];
  isLoading: boolean;
  onSelect: (item: MediaItem) => void;
  onDelete: (id: number) => void;
  onDownload: (item: MediaItem) => void;
}

function GalleryGrid({ items, isLoading, onSelect, onDelete, onDownload }: GalleryGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {[...Array(8)].map((_, index) => (
          <div key={index} className="overflow-hidden rounded-lg bg-muted animate-pulse aspect-square" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center border rounded-lg">
        <div className="p-3 rounded-full bg-muted">
          <ExternalLink className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-medium">No media found</h3>
        <p className="text-muted-foreground">You haven't captured any media yet</p>
        <Button asChild>
          <Link href="/">Go to Camera</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <Card 
          key={item.id} 
          className="group relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => onSelect(item)}
        >
          {item.mediaType === 'image' && (
            <img
              src={item.mediaUrl}
              alt={`Captured image ${item.id}`}
              className="object-cover w-full aspect-square"
            />
          )}
          {item.mediaType === 'video' && (
            <div className="relative">
              <video 
                src={item.mediaUrl}
                className="object-cover w-full aspect-square"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 ml-1 border-t-8 border-b-8 border-l-8 border-transparent border-l-white" />
                </div>
              </div>
            </div>
          )}
          <div className="absolute inset-0 flex-col items-end justify-between p-3 transition-opacity bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 flex">
            <div className="flex gap-1 self-end">
              <Button 
                size="icon" 
                variant="secondary" 
                className="w-7 h-7 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(item);
                }}
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
              <Button 
                size="icon" 
                variant="destructive" 
                className="w-7 h-7 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="w-full">
              <span className="inline-block px-2 py-1 text-xs text-white capitalize rounded-md bg-black/50">
                {item.mediaType}
              </span>
              <p className="mt-1 text-xs text-white">
                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}