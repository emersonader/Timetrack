import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Client } from '../types';
import { useClients, useClientSearch } from '../hooks/useClients';
import { useSubscription } from '../contexts/SubscriptionContext';
import { COLORS, SPACING } from '../utils/constants';
import { SearchBar } from '../components/SearchBar';
import { ClientCard } from '../components/ClientCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

type Props = NativeStackScreenProps<RootStackParamList, 'ChooseClient'>;

export function ChooseClientScreen({ navigation }: Props) {
  const { clients, isLoading, refresh } = useClients();
  const { results, search, clearSearch } = useClientSearch(clients);
  const { canAddMoreClients } = useSubscription();
  const [searchQuery, setSearchQuery] = useState('');

  // Refresh clients when screen gains focus
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      search(query);
    } else {
      clearSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    clearSearch();
  };

  const handleClientPress = (client: Client) => {
    navigation.navigate('ClientDetails', { clientId: client.id });
  };

  const handleAddClient = () => {
    if (canAddMoreClients(clients.length)) {
      navigation.navigate('AddClient');
    } else {
      navigation.navigate('Paywall', { feature: 'unlimited_clients' });
    }
  };

  const renderClient = ({ item }: { item: Client }) => (
    <ClientCard
      client={item}
      onPress={() => handleClientPress(item)}
      showRate
    />
  );

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading clients..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder="Search by name, phone, or address..."
          value={searchQuery}
          onChangeText={handleSearch}
          onClear={handleClearSearch}
        />
      </View>

      {clients.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No Clients Yet"
          message="Add your first client to start tracking time"
          actionLabel="Add Client"
          onAction={handleAddClient}
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No Results"
          message={`No clients found matching "${searchQuery}"`}
          actionLabel="Add New Client"
          onAction={handleAddClient}
        />
      ) : (
        <FlatList
          data={results}
          renderItem={renderClient}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  list: {
    padding: SPACING.md,
  },
});
