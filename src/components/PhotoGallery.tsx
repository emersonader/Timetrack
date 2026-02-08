import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Photo } from '../types';
import { getPhotoUri } from '../services/photoService';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../utils/constants';

const SCREEN_WIDTH = Dimensions.get('window').width;
const THUMB_SIZE = (SCREEN_WIDTH - SPACING.md * 2 - SPACING.xs * 3) / 4;

interface PhotoGalleryProps {
  photos: Photo[];
  onAddFromCamera: () => void;
  onAddFromGallery: () => void;
  onDelete: (photo: Photo) => void;
  isLoading?: boolean;
}

export function PhotoGallery({
  photos,
  onAddFromCamera,
  onAddFromGallery,
  onDelete,
  isLoading,
}: PhotoGalleryProps) {
  const [viewingPhoto, setViewingPhoto] = useState<Photo | null>(null);

  const handleLongPress = (photo: Photo) => {
    Alert.alert('Delete Photo', 'Remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete(photo),
      },
    ]);
  };

  const handleAddPress = () => {
    Alert.alert('Add Photo', 'Choose a source', [
      { text: 'Camera', onPress: onAddFromCamera },
      { text: 'Photo Library', onPress: onAddFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="camera-outline" size={16} color={COLORS.gray500} />
          <Text style={styles.headerTitle}>
            Photos{photos.length > 0 ? ` (${photos.length})` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddPress}
          disabled={isLoading}
        >
          <Ionicons name="add" size={18} color={COLORS.primary} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {photos.length === 0 ? (
        <TouchableOpacity style={styles.emptyState} onPress={handleAddPress}>
          <Ionicons name="image-outline" size={24} color={COLORS.gray300} />
          <Text style={styles.emptyText}>Tap to add job photos</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.grid}>
          {photos.map((photo) => (
            <TouchableOpacity
              key={photo.id}
              style={styles.thumb}
              onPress={() => setViewingPhoto(photo)}
              onLongPress={() => handleLongPress(photo)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: getPhotoUri(photo.file_path) }}
                style={styles.thumbImage}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Full-screen photo viewer */}
      <Modal
        visible={!!viewingPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingPhoto(null)}
      >
        <View style={styles.viewerOverlay}>
          <TouchableOpacity
            style={styles.viewerClose}
            onPress={() => setViewingPhoto(null)}
          >
            <Ionicons name="close" size={28} color={COLORS.white} />
          </TouchableOpacity>
          {viewingPhoto && (
            <Image
              source={{ uri: getPhotoUri(viewingPhoto.file_path) }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          )}
          {viewingPhoto && (
            <TouchableOpacity
              style={styles.viewerDelete}
              onPress={() => {
                handleLongPress(viewingPhoto);
                setViewingPhoto(null);
              }}
            >
              <Ionicons name="trash-outline" size={22} color={COLORS.white} />
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </View>
  );
}

/**
 * Compact photo count badge for session cards.
 */
export function PhotoCountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Ionicons name="camera" size={11} color={COLORS.gray500} />
      <Text style={styles.badgeText}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary + '10',
  },
  addButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderStyle: 'dashed',
    gap: SPACING.xs,
  },
  emptyText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray400,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },

  // Full-screen viewer
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: SPACING.sm,
  },
  viewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  viewerDelete: {
    position: 'absolute',
    bottom: 60,
    padding: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BORDER_RADIUS.full,
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  badgeText: {
    fontSize: 10,
    color: COLORS.gray500,
  },
});
