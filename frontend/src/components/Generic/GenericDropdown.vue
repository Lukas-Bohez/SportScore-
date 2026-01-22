<template>
  <div class="generic-input">
    <label v-if="label" class="text">{{ label }}</label>
    <el-dropdown
      ref="dropdownRef"
      class="generic-dropdown__wrapper"
      trigger="click"
      placement="bottom-start"
      :popper-options="popperOptions"
      popper-class="generic-dropdown-popper"
      @command="handleCommand"
      @visible-change="onVisibleChange"
    >
      <div
        class="input-base generic-input__field generic-dropdown__select"
        ref="triggerRef"
      >
        <span class="generic-dropdown__selected">
          {{ selectedLabel || placeholder }}
        </span>
        <ChevronDown
          class="generic-dropdown__icon"
          :class="{ 'is-open': isOpen }"
          :size="20"
        />
      </div>
      <template #dropdown>
        <el-dropdown-menu class="generic-dropdown__menu">
          <el-dropdown-item
            v-for="option in options"
            :key="option.value"
            :command="option.value"
            :class="{ 'is-active': modelValue === option.value }"
          >
            {{ option.label }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script>
import { ChevronDown } from "lucide-vue-next";
import { ElDropdown, ElDropdownMenu, ElDropdownItem } from "element-plus";

export default {
  name: "GenericDropdown",
  components: {
    ChevronDown,
    ElDropdown,
    ElDropdownMenu,
    ElDropdownItem,
  },
  props: {
    label: {
      type: String,
      default: "",
    },
    placeholder: {
      type: String,
      default: "Selecteer een optie",
    },
    options: {
      type: Array,
      required: true,
      default: () => [],
    },
    modelValue: {
      type: [String, Number],
      default: "",
    },
  },
  emits: ["update:modelValue"],
  data() {
    return {
      isOpen: false,
      popperOptions: {
        modifiers: [
          {
            name: "sameWidth",
            enabled: true,
            phase: "beforeWrite",
            requires: ["computeStyles"],
            fn: ({ state }) => {
              state.styles.popper.width = `${state.rects.reference.width}px`;
            },
            effect: ({ state }) => {
              state.elements.popper.style.width = `${state.elements.reference.offsetWidth}px`;
            },
          },
        ],
      },
    };
  },
  computed: {
    selectedLabel() {
      const selected = this.options.find(
        (opt) => opt.value === this.modelValue,
      );
      return selected ? selected.label : "";
    },
  },
  methods: {
    handleCommand(value) {
      this.$emit("update:modelValue", value);
    },
    onVisibleChange(visible) {
      this.isOpen = visible;
    },
  },
};
</script>

<style scoped>
.generic-dropdown__wrapper {
  position: relative;
  width: 100%;
  display: block;
}

.generic-dropdown__select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: var(--space-7);
  cursor: pointer;
  width: 100%;
  user-select: none;
}

.generic-dropdown__selected {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.generic-dropdown__icon {
  color: var(--blue-100);
  flex-shrink: 0;
  margin-left: var(--space-2);
  transition: transform 0.3s ease;
}

.generic-dropdown__icon.is-open {
  transform: rotate(180deg);
}
</style>

<style>
/* Global styling voor de dropdown popper */
.generic-dropdown-popper {
  padding: 0 !important;
}

.generic-dropdown-popper .el-dropdown-menu {
  width: 100% !important;
  margin: 0 !important;
  background-color: var(--white);
  border: 1px solid var(--blue-100);
  border-radius: var(--radius-M);
  padding: var(--space-2) 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.generic-dropdown-popper .el-dropdown-menu__item {
  color: var(--black-100);
  padding: var(--space-3) var(--space-4);
  transition: background-color 0.2s ease;
  white-space: nowrap;
  width: 100%;
  line-height: 1.5;
}

.generic-dropdown-popper .el-dropdown-menu__item:hover {
  background-color: var(--blue-10);
  color: var(--black-100);
}

.generic-dropdown-popper .el-dropdown-menu__item.is-active {
  color: var(--blue-100);
  background-color: var(--blue-10);
  font-weight: 600;
}
</style>
