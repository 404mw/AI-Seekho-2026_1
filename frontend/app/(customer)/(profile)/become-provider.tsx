import React from 'react';
import {
  ScrollView, View, Text, TextInput, Pressable,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { ModeContext } from '@/context/mode-context';
import { colors } from '@/constants/colors';
import { spacing, typography, radius } from '@/constants/tokens';
import type { ServiceCategory } from '@/lib/types';

const RADIUS_OPTIONS = [5, 10, 15, 20, 30, 50];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const VARIANTS = ['Standard', 'Basic', 'Premium', 'Express', 'Deep Clean', 'Emergency'];
const TOTAL_STEPS = 4;

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.xl }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            backgroundColor: i <= current ? colors.brandSecondary : colors.separator,
          }}
        />
      ))}
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <Text style={{ ...typography.subhead, color: colors.labelSecondary, marginBottom: spacing.xs }}>
      {label}
    </Text>
  );
}

function Field({
  label, value, onChangeText, placeholder, keyboardType, multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
  multiline?: boolean;
}) {
  return (
    <View>
      <FieldLabel label={label} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.labelTertiary}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        style={{
          backgroundColor: colors.backgroundSecondary,
          borderRadius: radius.md,
          borderCurve: 'continuous',
          padding: spacing.md,
          ...typography.body,
          color: colors.label,
          minHeight: multiline ? 80 : undefined,
          textAlignVertical: multiline ? 'top' : undefined,
        }}
      />
    </View>
  );
}

export default function BecomeProviderScreen() {
  const router = useRouter();
  const { setMode, setHasProviderProfile, setCanBeProvider, setPendingProviderOnboarding } = React.use(ModeContext)!;

  // Clear the pending flag when this screen mounts (wizard is now open) so AuthGate
  // doesn't re-redirect if the user navigates back without completing setup.
  React.useEffect(() => {
    setPendingProviderOnboarding(false);
  }, []);

  const [step, setStep] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Step 0 — Business Info
  const [businessName, setBusinessName] = React.useState('');
  const [contactPerson, setContactPerson] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');

  // Step 1 — Location & Coverage
  const [city, setCity] = React.useState('');
  const [radiusKm, setRadiusKm] = React.useState<number>(10);

  // Step 2 — Service & Pricing
  const [categories, setCategories] = React.useState<ServiceCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<ServiceCategory | null>(null);
  const [selectedVariants, setSelectedVariants] = React.useState<Set<string>>(new Set());
  const [basePriceStr, setBasePriceStr] = React.useState('');
  const [hourlyRateStr, setHourlyRateStr] = React.useState('');

  // Step 3 — Schedule
  const [selectedDays, setSelectedDays] = React.useState<Set<number>>(new Set([0, 1, 2, 3, 4]));
  const [startTime, setStartTime] = React.useState('09:00');
  const [endTime, setEndTime] = React.useState('18:00');

  const [stepError, setStepError] = React.useState<string | null>(null);

  const [categoriesError, setCategoriesError] = React.useState(false);

  const loadCategories = () => {
    setCategoriesLoading(true);
    setCategoriesError(false);
    api.get<ServiceCategory[]>('/catalog/categories')
      .then((data) => setCategories(data ?? []))
      .catch(() => setCategoriesError(true))
      .finally(() => setCategoriesLoading(false));
  };

  // Load categories when arriving at step 2
  React.useEffect(() => {
    if (step !== 2 || categories.length > 0) return;
    loadCategories();
  }, [step]);

  const toggleVariant = (v: string) => {
    setSelectedVariants((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v); else next.add(v);
      return next;
    });
  };

  const toggleDay = (idx: number) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!businessName.trim()) return 'Business name is required.';
    }
    if (step === 1) {
      if (!city.trim()) return 'City is required.';
    }
    if (step === 2) {
      if (!selectedCategory) return 'Please select a service category.';
      if (selectedVariants.size === 0) return 'Please select at least one service variant.';
      if (!basePriceStr || isNaN(Number(basePriceStr))) return 'Please enter a valid base fee.';
      if (!hourlyRateStr || isNaN(Number(hourlyRateStr))) return 'Please enter a valid hourly rate.';
    }
    if (step === 3) {
      if (selectedDays.size === 0) return 'Select at least one working day.';
      const timeRe = /^\d{2}:\d{2}$/;
      if (!timeRe.test(startTime) || !timeRe.test(endTime)) return 'Times must be in HH:MM format.';
      if (startTime >= endTime) return 'End time must be after start time.';
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setStepError(err); return; }
    setStepError(null);
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setStepError(null);
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    const err = validateStep();
    if (err) { setStepError(err); return; }
    setStepError(null);
    setIsSubmitting(true);

    try {
      await api.post('/providers/me/sync', {
        business_name: businessName.trim(),
        contact_person: contactPerson.trim() || businessName.trim(),
        phone_number: phoneNumber.trim() || undefined,
        city: city.trim(),
        service_radius_km: radiusKm,
      });

      for (const variant of selectedVariants) {
        await api.post('/providers/me/offerings', {
          category_id: selectedCategory!.id,
          variant_name: variant,
          base_price: Number(basePriceStr),
          hourly_rate: Number(hourlyRateStr),
        });
      }

      const schedule = Array.from(selectedDays).map((day) => ({
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
        is_active: true,
      }));
      await api.put('/providers/me/schedule', { schedule });

      setHasProviderProfile(true);
      setCanBeProvider(true);
      setMode('provider');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      Alert.alert('Setup Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Set Up Provider Account' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}
      >
        <StepIndicator current={step} total={TOTAL_STEPS} />

        {/* ── Step 0: Business Info ─────────────────────────────────────────── */}
        {step === 0 && (
          <View style={{ gap: spacing.lg }}>
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.title3, color: colors.label }}>Business Info</Text>
              <Text style={{ ...typography.subhead, color: colors.labelSecondary }}>
                How customers will see you on Khidmat AI.
              </Text>
            </View>
            <Field label="Business Name *" value={businessName} onChangeText={setBusinessName} placeholder="e.g. Ali's Plumbing Services" />
            <Field label="Your Name (contact person)" value={contactPerson} onChangeText={setContactPerson} placeholder="e.g. Ali Hassan" />
            <Field label="Phone Number" value={phoneNumber} onChangeText={setPhoneNumber} placeholder="+92 300 0000000" keyboardType="phone-pad" />
          </View>
        )}

        {/* ── Step 1: Location & Coverage ──────────────────────────────────── */}
        {step === 1 && (
          <View style={{ gap: spacing.lg }}>
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.title3, color: colors.label }}>Location & Coverage</Text>
              <Text style={{ ...typography.subhead, color: colors.labelSecondary }}>
                Where you operate and how far you'll travel.
              </Text>
            </View>
            <Field label="City *" value={city} onChangeText={setCity} placeholder="e.g. Lahore" />
            <View>
              <FieldLabel label="Service Radius" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {RADIUS_OPTIONS.map((km) => (
                  <TouchableOpacity
                    key={km}
                    onPress={() => setRadiusKm(km)}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: radius.pill,
                      borderCurve: 'continuous',
                      backgroundColor: radiusKm === km ? colors.brandSecondary : colors.backgroundSecondary,
                      borderWidth: 1.5,
                      borderColor: radiusKm === km ? colors.brandSecondary : 'transparent',
                    }}
                  >
                    <Text style={{
                      ...typography.callout,
                      color: radiusKm === km ? colors.accentText : colors.label,
                      fontWeight: '600',
                    }}>
                      {km} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── Step 2: Service & Pricing ────────────────────────────────────── */}
        {step === 2 && (
          <View style={{ gap: spacing.lg }}>
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.title3, color: colors.label }}>Service & Pricing</Text>
              <Text style={{ ...typography.subhead, color: colors.labelSecondary }}>
                What you offer and what you charge.
              </Text>
            </View>

            <View>
              <FieldLabel label="Service Category *" />
              {categoriesLoading ? (
                <ActivityIndicator color={colors.brandSecondary} style={{ marginTop: spacing.md }} />
              ) : categoriesError ? (
                <TouchableOpacity onPress={loadCategories} style={{ alignItems: 'center', padding: spacing.md }}>
                  <Text style={{ ...typography.subhead, color: colors.error }}>Failed to load categories.</Text>
                  <Text style={{ ...typography.footnote, color: colors.accent, marginTop: spacing.xs }}>Tap to retry</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setSelectedCategory(cat)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: spacing.md,
                        borderRadius: radius.card,
                        borderCurve: 'continuous',
                        backgroundColor: selectedCategory?.id === cat.id
                          ? colors.brandSecondaryLight
                          : colors.backgroundSecondary,
                        borderWidth: 1.5,
                        borderColor: selectedCategory?.id === cat.id ? colors.brandSecondary : 'transparent',
                      }}
                    >
                      <Ionicons
                        name={selectedCategory?.id === cat.id ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={selectedCategory?.id === cat.id ? colors.brandSecondary : colors.labelTertiary}
                        style={{ marginRight: spacing.md }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...typography.callout, color: colors.label }}>{cat.name}</Text>
                        {cat.description && (
                          <Text style={{ ...typography.footnote, color: colors.labelSecondary, marginTop: 2 }}>
                            {cat.description}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View>
              <FieldLabel label="Service Variants * (select all that apply)" />
              <View style={{ gap: spacing.sm }}>
                {VARIANTS.map((v) => {
                  const checked = selectedVariants.has(v);
                  return (
                    <TouchableOpacity
                      key={v}
                      onPress={() => toggleVariant(v)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: spacing.md,
                        borderRadius: radius.card,
                        borderCurve: 'continuous',
                        backgroundColor: checked ? colors.brandSecondaryLight : colors.backgroundSecondary,
                        borderWidth: 1.5,
                        borderColor: checked ? colors.brandSecondary : 'transparent',
                      }}
                    >
                      <Ionicons
                        name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={checked ? colors.brandSecondary : colors.labelTertiary}
                        style={{ marginRight: spacing.md }}
                      />
                      <Text style={{ ...typography.callout, color: colors.label }}>{v}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Base Fee (Rs.) *"
                  value={basePriceStr}
                  onChangeText={setBasePriceStr}
                  placeholder="500"
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Hourly Rate (Rs.) *"
                  value={hourlyRateStr}
                  onChangeText={setHourlyRateStr}
                  placeholder="800"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        )}

        {/* ── Step 3: Schedule ─────────────────────────────────────────────── */}
        {step === 3 && (
          <View style={{ gap: spacing.lg }}>
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.title3, color: colors.label }}>Working Schedule</Text>
              <Text style={{ ...typography.subhead, color: colors.labelSecondary }}>
                When are you available to take bookings?
              </Text>
            </View>

            <View>
              <FieldLabel label="Working Days *" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {DAYS.map((day, idx) => {
                  const active = selectedDays.has(idx);
                  return (
                    <TouchableOpacity
                      key={day}
                      onPress={() => toggleDay(idx)}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: active ? colors.brandSecondary : colors.backgroundSecondary,
                        borderWidth: 1.5,
                        borderColor: active ? colors.brandSecondary : 'transparent',
                      }}
                    >
                      <Text style={{
                        ...typography.caption1,
                        color: active ? colors.accentText : colors.label,
                        fontWeight: '600',
                      }}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Field label="Start Time *" value={startTime} onChangeText={setStartTime} placeholder="09:00" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="End Time *" value={endTime} onChangeText={setEndTime} placeholder="18:00" />
              </View>
            </View>

            <View
              style={{
                backgroundColor: colors.accentLighter,
                borderRadius: radius.md,
                borderCurve: 'continuous',
                padding: spacing.md,
                flexDirection: 'row',
                gap: spacing.sm,
                alignItems: 'flex-start',
              }}
            >
              <Ionicons name="information-circle-outline" size={18} color={colors.labelSecondary} />
              <Text style={{ ...typography.footnote, color: colors.labelSecondary, flex: 1, lineHeight: 18 }}>
                These hours apply to all selected days. You can adjust individual days from your provider dashboard later.
              </Text>
            </View>
          </View>
        )}

        {/* ── Error message ─────────────────────────────────────────────────── */}
        {stepError && (
          <Text style={{ ...typography.footnote, color: colors.error, marginTop: spacing.md }}>
            {stepError}
          </Text>
        )}

        {/* ── Navigation buttons ────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xxl }}>
          {step > 0 && (
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: colors.backgroundSecondary,
                borderRadius: radius.md,
                borderCurve: 'continuous',
                padding: spacing.md,
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ ...typography.headline, color: colors.label }}>Back</Text>
            </Pressable>
          )}

          {step < TOTAL_STEPS - 1 ? (
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: colors.brandSecondary,
                borderRadius: radius.md,
                borderCurve: 'continuous',
                padding: spacing.md,
                alignItems: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ ...typography.headline, color: colors.accentText }}>Next</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: colors.brandSecondary,
                borderRadius: radius.md,
                borderCurve: 'continuous',
                padding: spacing.md,
                alignItems: 'center',
                opacity: pressed || isSubmitting ? 0.7 : 1,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: spacing.sm,
              })}
            >
              {isSubmitting && <ActivityIndicator size="small" color={colors.accentText} />}
              <Text style={{ ...typography.headline, color: colors.accentText }}>
                {isSubmitting ? 'Setting up…' : 'Finish Setup'}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </>
  );
}
