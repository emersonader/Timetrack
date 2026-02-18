import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
    return <LoadingSpinner fullScreen message={t('chooseClient.loadingClients')} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder={t('chooseClient.searchPlaceholder')}
          value={searchQuery}
          onChangeText={handleSearch}
          onClear={handleClearSearch}
        />
      </View>

      {clients.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={t('chooseClient.noClientsYet')}
          message={t('chooseClient.noClientsMessage')}
          actionLabel={t('chooseClient.addClient')}
          onAction={handleAddClient}
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title={t('chooseClient.noResults')}
          message={t('chooseClient.noResultsMessage', { query: searchQuery })}
          actionLabel={t('chooseClient.addNewClient')}
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
