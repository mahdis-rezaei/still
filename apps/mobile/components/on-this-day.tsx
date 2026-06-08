import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getOnThisDay, onThisDayLabel, localTodayISO } from "../lib/memories";
import { DateMemoryCard } from "./date-memory-card";

// On This Day on Today. Stays SILENT (renders nothing) when there's nothing from
// this exact calendar day in prior years — never an empty box, never a nudge to
// look. A collapsible ladder steps through each year. The fuller browse lives on
// the Look back tab.
export function OnThisDay() {
  const [showYears, setShowYears] = useState(false);
  const date = localTodayISO();
  const { data, isLoading } = useQuery({
    queryKey: ["on-this-day", date],
    queryFn: () => getOnThisDay(date),
    staleTime: 60 * 60 * 1000,
  });

  const years = (data ?? []).filter((m) => m.onThisExactDay);
  if (isLoading || years.length === 0) return null;

  return (
    <View className="mt-10">
      <Text className="text-2xl text-deep-brown mb-4">On this day</Text>

      <DateMemoryCard heading={onThisDayLabel(years[0])} memory={years[0]} />

      {years.length > 1 && (
        <View className="mt-4">
          <Pressable onPress={() => setShowYears((v) => !v)} hitSlop={8}>
            <Text className="text-soft-ink">
              {showYears ? "Hide other years" : `See each year (${years.length})`}
            </Text>
          </Pressable>
          {showYears && (
            <View className="mt-4 gap-4">
              {years.slice(1).map((m) => (
                <DateMemoryCard
                  key={m.entryId}
                  heading={onThisDayLabel(m)}
                  memory={m}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
