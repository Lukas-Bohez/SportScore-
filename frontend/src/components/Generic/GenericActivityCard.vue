<template>
  <div
    class="activity-card"
    :class="{ 'activity-card--active': isActive }"
    @click="$emit('select')"
  >
    <div class="activity-status-indicator"></div>
    <div class="activity-card-content">
      <h4 class="activity-card-title">{{ title }}</h4>
      <p class="activity-card-info">{{ activitiesCount }} Activiteiten</p>
      <p class="activity-card-info">{{ teamsCount }} teams</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  activitiesCount: {
    type: Number,
    required: true,
  },
  teamsCount: {
    type: Number,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["select"]);
</script>

<style scoped>
.activity-card {
  position: relative;
  width: 100%;
  min-height: 8rem;
  padding: var(--space-6) var(--space-5);
  border: 1px solid var(--blue-100);
  border-radius: var(--radius-L);
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: var(--white);
}

.activity-card:hover {
  border-color: var(--blue-80, #3a7bd5);
  box-shadow: 0 2px 8px rgba(24, 152, 233, 0.15);
}

.activity-card--active {
  border-color: var(--blue-100);
  background-color: var(--blue-10);
}

.activity-status-indicator {
  position: absolute;
  left: 0.6875rem;
  top: 1.75rem;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background-color: var(--green-100);
}

.activity-card-content {
  padding-left: var(--space-4);
}

.activity-card-title {
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.25rem;
  color: var(--black-90);
  margin-bottom: var(--space-4);
}

.activity-card-info {
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.25rem;
  color: var(--black-90);
  margin-bottom: var(--space-4);
}

.activity-card-info:last-child {
  margin-bottom: 0;
}
</style>
