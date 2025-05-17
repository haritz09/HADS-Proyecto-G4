<template>
  <div class="building-menu" v-if="show">
    <h2>Construcción de Edificios</h2>
    <div class="buildings-grid">
      <div v-for="building in availableBuildings" :key="building.type" class="building-item">
        <img :src="building.icon" :alt="building.name">
        <h3>{{ building.name }}</h3>
        <p>Coste: {{ building.cost }} oro</p>
        <button @click="buildStructure(building.type)" :disabled="gold < building.cost">Construir</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BuildingMenu',
  props: {
    show: Boolean,
    gold: Number,
  },
  data() {
    return {
      availableBuildings: [
        { type: 'archers', name: 'Cuartel de Arqueros', icon: '/buildings/archers.png', cost: 1000 },
        { type: 'barracks', name: 'Barracas', icon: '/buildings/barracks.png', cost: 2000 },
        { type: 'mages', name: 'Torre de Magos', icon: '/buildings/mages.png', cost: 3000 },
        { type: 'knights', name: 'Academia de Caballeros', icon: '/buildings/knights.png', cost: 2500 },
        { type: 'tavern', name: 'Taberna', icon: '/buildings/tavern.png', cost: 1500 },
        { type: 'marketplace', name: 'Mercado', icon: '/buildings/marketplace.png', cost: 1000 },
        { type: 'blacksmith', name: 'Herrería', icon: '/buildings/blacksmith.png', cost: 2000 },
        { type: 'library', name: 'Biblioteca', icon: '/buildings/library.png', cost: 1500 }
      ]
    }
  },
  methods: {
    buildStructure(buildingType) {
      this.$store.dispatch('game/performAction', {
        type: 'buildStructure',
        details: {
          building_type: buildingType
        }
      });
    }
  }
}
</script>
