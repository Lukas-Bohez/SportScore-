<template>
  <div class="generic-card">
    <div class="card-header">
      <p class="card-title">{{ title }}</p>
      <p class="card-date">{{ date }}</p>
    </div>
    <div v-if="activities && activities.length > 0" class="card-activities">
      <p class="activities-label">Activiteiten:</p>
      <div class="activities-list">
        <span
          v-for="(activity, index) in activities"
          :key="index"
          class="activity-badge"
        >
          {{ activity.name || activity }}
        </span>
      </div>
    </div>
    <div v-if="teams && teams.length > 0" class="card-teams">
      <p class="teams-label">Deelnemers:</p>
      <div class="teams-list">
        <span v-for="(team, index) in teams" :key="index" class="team-badge">
          {{ team.name || team }} {{ team.icon || "" }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineOptions({ name: "GenericCard" });

defineProps({
  title: {
    type: String,
    required: true,
    default: "",
  },
  date: {
    type: String,
    required: true,
    default: "",
  },
  teams: {
    type: Array,
    required: false,
    default: () => [],
  },
  activities: {
    type: Array,
    required: false,
    default: () => [],
  },
});
</script>
<style scoped>
.generic-card {
  border: 2px solid var(--black-40);
  background-color: var(--white);
  border-radius: var(--radius-L);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
  transition: border-color 0.2s ease;
}

.generic-card:hover {
  border-color: var(--blue-100);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-weight: 600;
  color: var(--black-100);
}

.card-date {
  color: var(--black-60);
  font-size: var(--font-size-S);
}

.card-activities {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.activities-label {
  font-size: var(--font-size-S);
  color: var(--black-60);
  font-weight: 500;
}

.activities-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.activity-badge {
  padding: var(--space-2) var(--space-3);
  background-color: var(--green-20, #e8f5e9);
  border: 1px solid var(--green-40, #81c784);
  border-radius: var(--radius-M);
  font-size: var(--font-size-S);
  color: var(--black-80);
}

.card-teams {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.teams-label {
  font-size: var(--font-size-S);
  color: var(--black-60);
  font-weight: 500;
}

.teams-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.team-badge {
  padding: var(--space-2) var(--space-3);
  background-color: var(--blue-20);
  border: 1px solid var(--blue-40);
  border-radius: var(--radius-M);
  font-size: var(--font-size-S);
  color: var(--black-80);
}
</style>
