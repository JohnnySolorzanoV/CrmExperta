<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  getWeekDays,
  getHourSlots,
  getItemsForCell,
  navegarSemana,
  formatDayHeader,
  formatHour,
  isToday,
  STATUS_CLASS,
} from '../utils/calendarGrid'

/**
 * WeeklyCalendarGrid — reusable weekly calendar grid.
 *
 * Props:
 *  items        Array of normalised calendar items produced by
 *               mapSlotsToCalendarItems() or mapCitasToCalendarItems().
 *  mode         'select' — client slot picker (items are clickable).
 *               'view'   — lawyer read view (items show status tags, emits actions).
 *  modelValue   Currently selected item id (used in select mode).
 *  startHour    First hour row to show (default 8).
 *  endHour      Last hour row (exclusive, default 19).
 *
 * Emits:
 *  update:modelValue(id)    — when a slot is clicked in select mode.
 *  cita-action(action, raw) — when an action button is clicked in view mode.
 *                             action is 'aceptar' | 'cancelar' | 'crear-caso'.
 */

const props = defineProps({
  items: { type: Array, default: () => [] },
  mode: { type: String, default: 'view' },
  modelValue: { type: [String, Number, null], default: null },
  startHour: { type: Number, default: 7 },
  endHour: { type: Number, default: 20 },
  /** When true, hides the action buttons on cita cards (useful for read-only client view). */
  readonly: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'cita-action'])

const currentDate = ref(new Date())
const now = ref(new Date())
let nowTimer = null

const weekDays = computed(() => getWeekDays(currentDate.value))
const visibleWeekDays = computed(() =>
  weekDays.value.filter((day) => {
    const weekday = day.getDay()
    return weekday >= 1 && weekday <= 5
  })
)
const hourSlots = computed(() => getHourSlots(props.startHour, props.endHour))

const weekLabel = computed(() => {
  const days = visibleWeekDays.value
  if (days.length === 0) return ''
  const fmt = (d) =>
    d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${fmt(days[0])} – ${fmt(days[days.length - 1])}`
})

/**
 * In select mode: when items first load, jump to the week containing the
 * earliest slot so the user doesn't have to navigate to find them.
 */
watch(
  () => props.items,
  (newItems) => {
    if (props.mode !== 'select' || newItems.length === 0) return
    const sorted = [...newItems].sort(
      (a, b) => new Date(a._datetime) - new Date(b._datetime)
    )
    currentDate.value = new Date(sorted[0]._datetime)
  },
  { immediate: true }
)

/** True when there are items but none fall in the currently visible week. */
const hasItemsButNoneThisWeek = computed(() => {
  if (props.items.length === 0) return false
  const days = visibleWeekDays.value
  return !props.items.some((item) => {
    const d = new Date(item._datetime)
    return days.some(
      (day) =>
        d.getFullYear() === day.getFullYear() &&
        d.getMonth() === day.getMonth() &&
        d.getDate() === day.getDate()
    )
  })
})

function prevWeek() {
  currentDate.value = navegarSemana(currentDate.value, -1)
}
function nextWeek() {
  currentDate.value = navegarSemana(currentDate.value, 1)
}
function goToday() {
  currentDate.value = new Date()
}

function cellItems(day, hour) {
  return getItemsForCell(props.items, day, hour)
}

function isSelected(item) {
  return String(item.id) === String(props.modelValue)
}

function selectSlot(item) {
  if (props.mode !== 'select') return
  if (item.variant === 'current') return
  emit('update:modelValue', String(item.id))
}

function citaAction(action, item) {
  emit('cita-action', action, item._raw)
}

function statusClass(status) {
  return STATUS_CLASS[status] || 'secondary'
}

function statusLabel(status) {
  const labels = {
    pendiente: 'Pendiente',
    confirmada: 'Confirmada',
    cancelada: 'Cancelada',
    completada: 'Completada',
    reprogramada: 'Reprogramada',
  }
  return labels[status] || status
}

function isPastItem(item) {
  if (!item?._datetime) return false
  return new Date(item._datetime).getTime() < now.value.getTime()
}

function showCurrentTimeLine(day, hour) {
  if (!isToday(day)) return false
  return now.value.getHours() === hour
}

const currentMinutePercent = computed(() => (now.value.getMinutes() / 60) * 100)

onMounted(() => {
  nowTimer = setInterval(() => {
    now.value = new Date()
  }, 30000)
})

onBeforeUnmount(() => {
  if (nowTimer) clearInterval(nowTimer)
})
</script>

<template>
  <div class="wcg-wrapper">
    <!-- Navigation bar -->
    <div class="wcg-nav d-flex align-items-center gap-2 mb-2 flex-wrap">
      <button class="btn btn-sm btn-outline-secondary" @click="prevWeek" title="Semana anterior">
        &#8249;
      </button>
      <button class="btn btn-sm btn-outline-primary" @click="goToday">Hoy</button>
      <button class="btn btn-sm btn-outline-secondary" @click="nextWeek" title="Semana siguiente">
        &#8250;
      </button>
      <span class="wcg-week-label ms-2 text-muted small fw-semibold">{{ weekLabel }}</span>
    </div>

    <!-- Grid -->
    <div class="wcg-scroll-container">
      <table class="wcg-table">
        <!-- Day headers -->
        <thead>
          <tr>
            <th class="wcg-time-col"></th>
            <th
              v-for="(day, di) in visibleWeekDays"
              :key="di"
              class="wcg-day-header"
              :class="{ 'wcg-today': isToday(day) }"
            >
              <span v-if="isToday(day)" class="wcg-today-stamp">Hoy</span>
              {{ formatDayHeader(day) }}
            </th>
          </tr>
        </thead>

        <!-- Hour rows -->
        <tbody>
          <tr v-for="hour in hourSlots" :key="hour">
            <!-- Time label -->
            <td class="wcg-time-cell">{{ formatHour(hour) }}</td>

            <!-- Day cells -->
            <td
              v-for="(day, di) in visibleWeekDays"
              :key="di"
              class="wcg-cell"
              :class="{ 'wcg-today-col': isToday(day) }"
            >
              <div
                v-if="showCurrentTimeLine(day, hour)"
                class="wcg-now-line"
                :style="{ top: `${currentMinutePercent}%` }"
              >
                <span class="wcg-now-label">Ahora</span>
              </div>
              <!-- SELECT MODE: available slot chips -->
              <template v-if="mode === 'select'">
                <button
                  v-for="item in cellItems(day, hour)"
                  :key="item.id"
                  class="wcg-slot-chip"
                  :class="{
                    'wcg-slot-selected': isSelected(item),
                    'wcg-slot-current': item.variant === 'current',
                  }"
                  :disabled="item.variant === 'current'"
                  @click="selectSlot(item)"
                  :title="item.variant === 'current' ? 'Horario actual de tu cita' : (item.descripcion || item.label)"
                >
                  <span v-if="item.variant === 'current'" class="wcg-slot-current-tag">Actual</span>
                  {{ item.label }}
                </button>
              </template>

              <!-- VIEW MODE: appointment cards -->
              <template v-else>
                <div
                  v-for="item in cellItems(day, hour)"
                  :key="item.id"
                  class="wcg-cita-card"
                  :class="[
                    `wcg-cita-${statusClass(item.status)}`,
                    { 'wcg-cita-past': isPastItem(item) }
                  ]"
                >
                  <div class="wcg-cita-label">{{ item.label }}</div>
                  <div class="wcg-cita-time">{{ item._datetime ? new Date(item._datetime).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : '' }}</div>
                  <span class="wcg-cita-badge badge" :class="`bg-${statusClass(item.status)}`">
                    {{ statusLabel(item.status) }}
                  </span>
                  <div v-if="item.motivo" class="wcg-cita-motivo">{{ item.motivo }}</div>

                  <!-- Action buttons for lawyer view (hidden when readonly) -->
                  <div v-if="!readonly" class="wcg-cita-actions mt-1 d-flex gap-1 flex-wrap">
                    <button
                      v-if="item.status !== 'confirmada' && item.status !== 'cancelada' && item.status !== 'completada'"
                      class="btn btn-xs btn-outline-success"
                      @click.stop="citaAction('aceptar', item)"
                      :disabled="isPastItem(item)"
                    >
                      Aceptar
                    </button>
                    <button
                      v-if="item.status === 'confirmada'"
                      class="btn btn-xs btn-outline-primary"
                      @click.stop="citaAction('crear-caso', item)"
                      :disabled="isPastItem(item)"
                    >
                      Crear caso
                    </button>
                    <button
                      v-if="item.status !== 'cancelada'"
                      class="btn btn-xs btn-outline-danger"
                      @click.stop="citaAction('cancelar', item)"
                      :disabled="isPastItem(item)"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty state: no items at all -->
    <div v-if="items.length === 0" class="wcg-empty text-muted text-center py-3 small">
      <template v-if="mode === 'select'">No hay horarios disponibles.</template>
      <template v-else>No hay citas registradas.</template>
    </div>

    <!-- Items exist but none fall in this week -->
    <div v-else-if="hasItemsButNoneThisWeek" class="wcg-empty text-center py-3 small">
      <span class="text-muted">
        No hay
        <template v-if="mode === 'select'">horarios disponibles</template>
        <template v-else>citas</template>
        esta semana.
      </span>
      <button class="btn btn-sm btn-link py-0 ms-1" @click="nextWeek">Ver semana siguiente &rsaquo;</button>
    </div>
  </div>
</template>

<style scoped>
.wcg-wrapper {
  --ink-judicial: var(--bs-body-color);
  --paper-ivory: var(--bs-tertiary-bg);
  --surface-white: var(--bs-body-bg);
  --seal-burgundy: var(--bs-primary);
  --clerk-blue: var(--bs-primary);
  --line-parchment: var(--bs-border-color);
  --muted-note: var(--bs-secondary-color);
  --today-tint: var(--bs-primary-bg-subtle);
  --radius: 10px;

  font-size: 0.84rem;
  color: var(--ink-judicial);
  font-family: inherit;
}

.wcg-nav {
  padding: 0.25rem 0;
}

.wcg-nav :deep(.btn) {
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 600;
}

.wcg-nav :deep(.btn-outline-secondary) {
  border-color: var(--bs-secondary-border-subtle);
  color: var(--bs-secondary-color);
}

.wcg-nav :deep(.btn-outline-primary) {
  border-color: var(--seal-burgundy);
  color: var(--seal-burgundy);
}

.wcg-nav :deep(.btn-outline-primary:hover) {
  background: var(--seal-burgundy);
  border-color: var(--seal-burgundy);
  color: #fff;
}

.wcg-week-label {
  font-size: 0.93rem;
  color: var(--ink-judicial) !important;
  letter-spacing: 0.01em;
  font-family: inherit;
}

.wcg-scroll-container {
  overflow-x: auto;
  background: transparent;
}

.wcg-table {
  border-collapse: collapse;
  min-width: 600px;
  width: 100%;
  table-layout: fixed;
  border: 1px solid var(--line-parchment);
}

.wcg-time-col,
.wcg-time-cell {
  width: 66px;
  min-width: 66px;
  background: var(--paper-ivory);
  color: var(--muted-note);
  text-align: right;
  padding: 0.45rem 0.5rem;
  vertical-align: top;
  white-space: nowrap;
  border-right: 1px solid var(--line-parchment);
  font-size: 0.7rem;
  font-family: inherit;
}

.wcg-day-header {
  position: relative;
  text-align: center;
  padding: 0.58rem 0.25rem;
  background: var(--paper-ivory);
  border-bottom: 1px solid var(--line-parchment);
  border-right: 1px solid var(--line-parchment);
  font-weight: 650;
  text-transform: capitalize;
  white-space: nowrap;
  font-family: inherit;
  color: var(--ink-judicial);
}

.wcg-today {
  background: var(--today-tint);
  color: var(--bs-body-color);
}

.wcg-today-stamp {
  display: inline-block;
  margin-right: 0.36rem;
  padding: 0.02rem 0.4rem;
  border: 1px solid var(--bs-primary);
  border-radius: 999px;
  color: var(--bs-primary);
  font-size: 0.56rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-family: inherit;
}

.wcg-cell {
  position: relative;
  border-right: 1px solid var(--line-parchment);
  border-bottom: 1px solid var(--line-parchment);
  vertical-align: top;
  padding: 0.28rem;
  min-height: 48px;
  height: 48px;
  font-family: inherit;
}

.wcg-now-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  border-top: 2px solid var(--seal-burgundy);
  z-index: 3;
  pointer-events: none;
}

.wcg-now-label {
  position: absolute;
  top: -10px;
  right: 4px;
  background: var(--seal-burgundy);
  color: #fff;
  border-radius: 10px;
  padding: 0 5px;
  font-size: 0.62rem;
  line-height: 1.2;
}

.wcg-today-col {
  background: transparent;
}

.wcg-slot-chip {
  display: block;
  width: 100%;
  margin-bottom: 0.2rem;
  padding: 0.22rem 0.4rem;
  font-size: 0.73rem;
  border: 1px solid var(--clerk-blue);
  border-radius: 6px;
  background: var(--bs-primary-bg-subtle);
  color: var(--bs-primary-text-emphasis);
  cursor: pointer;
  text-align: center;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wcg-slot-chip:hover {
  background: color-mix(in srgb, var(--bs-primary-bg-subtle) 75%, var(--bs-primary) 25%);
  border-color: var(--bs-primary);
}

.wcg-slot-chip:focus-visible {
  outline: 2px solid var(--seal-burgundy);
  outline-offset: 1px;
}

.wcg-slot-selected {
  background: var(--bs-primary) !important;
  color: #fff !important;
  border-color: var(--bs-primary);
}

.wcg-slot-current {
  background: var(--bs-secondary-bg-subtle) !important;
  color: var(--bs-secondary-color) !important;
  border-color: var(--bs-secondary-border-subtle) !important;
  cursor: not-allowed;
  text-decoration: line-through;
  text-decoration-thickness: 1px;
  opacity: 0.85;
}

.wcg-slot-current-tag {
  display: inline-block;
  margin-right: 0.28rem;
  padding: 0 0.32rem;
  border-radius: 999px;
  background: var(--bs-secondary);
  color: #fff;
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  vertical-align: middle;
}

.wcg-cita-card {
  border-radius: 7px;
  padding: 0.3rem 0.38rem;
  margin-bottom: 0.22rem;
  border-left: 3px solid transparent;
  background: var(--bs-light-bg-subtle);
}

.wcg-cita-warning { border-left-color: var(--bs-warning); background: var(--bs-warning-bg-subtle); }
.wcg-cita-success { border-left-color: var(--bs-success); background: var(--bs-success-bg-subtle); }
.wcg-cita-danger { border-left-color: var(--bs-danger); background: var(--bs-danger-bg-subtle); }
.wcg-cita-info { border-left-color: var(--bs-info); background: var(--bs-info-bg-subtle); }
.wcg-cita-secondary { border-left-color: var(--bs-secondary); background: var(--bs-secondary-bg-subtle); }

.wcg-cita-past {
  opacity: 0.58;
}

.wcg-cita-label {
  font-weight: 640;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wcg-cita-time {
  color: var(--muted-note);
  font-size: 0.69rem;
  font-family: inherit;
}

.wcg-cita-badge {
  font-size: 0.63rem;
  padding: 1px 5px;
}

.wcg-cita-motivo {
  font-size: 0.7rem;
  color: var(--muted-note);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wcg-cita-actions :deep(.btn) {
  border-radius: 999px;
}

.btn-xs {
  padding: 1px 6px;
  font-size: 0.68rem;
}

.wcg-empty {
  border: 1px dashed var(--line-parchment);
  border-radius: var(--radius);
  color: var(--muted-note);
  background: var(--paper-ivory);
}

@media (max-width: 700px) {
  .wcg-table {
    min-width: 540px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wcg-slot-chip {
    transition: none;
  }
}
</style>
