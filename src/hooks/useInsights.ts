import { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  ClientInsight,
  EstimationAccuracy,
  SchedulingSuggestion,
  MaterialCostTrend,
  SeasonalPattern,
  CashFlowProjection,
  TopJobType,
  getClientInsights,
  getTopJobTypes,
  getEstimationAccuracy,
  getSchedulingSuggestions,
  getMaterialCostTrend,
  getSeasonalPatterns,
  getCashFlowProjection,
  getWeeklyEarningsTrend,
} from '../db/insightsRepository';

interface InsightsData {
  clientInsights: ClientInsight[];
  topJobTypes: TopJobType[];
  estimationAccuracy: EstimationAccuracy[];
  schedulingSuggestions: SchedulingSuggestion[];
  materialCostTrend: MaterialCostTrend[];
  seasonalPatterns: SeasonalPattern[];
  cashFlowProjection: CashFlowProjection[];
  weeklyTrend: { current: number; previous: number; percentChange: number };
  isLoading: boolean;
}

export function useInsights(): InsightsData {
  const [clientInsights, setClientInsights] = useState<ClientInsight[]>([]);
  const [topJobTypes, setTopJobTypes] = useState<TopJobType[]>([]);
  const [estimationAccuracy, setEstimationAccuracy] = useState<EstimationAccuracy[]>([]);
  const [schedulingSuggestions, setSchedulingSuggestions] = useState<SchedulingSuggestion[]>([]);
  const [materialCostTrend, setMaterialCostTrend] = useState<MaterialCostTrend[]>([]);
  const [seasonalPatterns, setSeasonalPatterns] = useState<SeasonalPattern[]>([]);
  const [cashFlowProjection, setCashFlowProjection] = useState<CashFlowProjection[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState({ current: 0, previous: 0, percentChange: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const navigation = useNavigation();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [
        clients,
        jobTypes,
        estimation,
        scheduling,
        materials,
        seasonal,
        cashFlow,
        weekly,
      ] = await Promise.all([
        getClientInsights(),
        getTopJobTypes(),
        getEstimationAccuracy(),
        getSchedulingSuggestions(),
        getMaterialCostTrend(),
        getSeasonalPatterns(),
        getCashFlowProjection(),
        getWeeklyEarningsTrend(),
      ]);

      setClientInsights(clients);
      setTopJobTypes(jobTypes);
      setEstimationAccuracy(estimation);
      setSchedulingSuggestions(scheduling);
      setMaterialCostTrend(materials);
      setSeasonalPatterns(seasonal);
      setCashFlowProjection(cashFlow);
      setWeeklyTrend(weekly);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reload on screen focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  return {
    clientInsights,
    topJobTypes,
    estimationAccuracy,
    schedulingSuggestions,
    materialCostTrend,
    seasonalPatterns,
    cashFlowProjection,
    weeklyTrend,
    isLoading,
  };
}
