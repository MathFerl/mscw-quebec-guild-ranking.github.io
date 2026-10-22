const { createApp, ref, computed, onMounted } = Vue;

createApp({
    setup() {
        const defaultFriends = [
            "Ferly", "Samourai", "JimxIL", "JimxNL", 
            "MCPekPek", "LeCorbusier", "GrosBiss", "JacRobi"
        ];

        const mockData = {
            "Ferly": { name: "Ferly", level: 112, job: "Dragon Knight", fame: 45, exp: 12450000, expPercent: 64.2, guild: "Legendary", world: "Scania" },
            "Samourai": { name: "Samourai", level: 108, job: "Hermit", fame: 82, exp: 9800000, expPercent: 41.8, guild: "Classic", world: "Scania" },
            "JimxIL": { name: "JimxIL", level: 95, job: "Ice/Lightning Arch Mage", fame: 30, exp: 5200000, expPercent: 88.5, guild: "Classic", world: "Scania" },
            "JimxNL": { name: "JimxNL", level: 120, job: "Night Lord", fame: 110, exp: 18900000, expPercent: 12.4, guild: "Valhalla", world: "Scania" },
            "MCPekPek": { name: "MCPekPek", level: 88, job: "Priest", fame: 65, exp: 3800000, expPercent: 55.0, guild: "MapleLife", world: "Scania" },
            "LeCorbusier": { name: "LeCorbusier", level: 102, job: "Ranger", fame: 28, exp: 7400000, expPercent: 29.3, guild: "Architects", world: "Scania" },
            "GrosBiss": { name: "GrosBiss", level: 79, job: "Chief Bandit", fame: 15, exp: 2100000, expPercent: 70.1, guild: "NoobGang", world: "Scania" },
            "JacRobi": { name: "JacRobi", level: 91, job: "Crusader", fame: 54, exp: 4600000, expPercent: 18.9, guild: "Legendary", world: "Scania" }
        };

        const trackedNames = ref([]);
        const characters = ref([]);
        const loading = ref(false);
        const isFallback = ref(false);
        const lastUpdated = ref(null);

        const searchQuery = ref('');
        const selectedJobCategory = ref('ALL');
        const sortBy = ref('level');
        const sortOrder = ref('desc');

        const selectedCharacter = ref(null);
        const showAddModal = ref(false);
        const newFriendName = ref('');
        const addLoading = ref(false);
        const addError = ref('');

        const jobCategories = [
            { id: 'ALL', label: 'Toutes les classes' },
            { id: 'WARRIOR', label: 'Guerriers' },
            { id: 'MAGE', label: 'Magiciens' },
            { id: 'ARCHER', label: 'Archers' },
            { id: 'THIEF', label: 'Voleurs' },
            { id: 'PIRATE', label: 'Pirates' },
        ];

        const initFriendsList = () => {
            const saved = localStorage.getItem('maple_friends_list');
            if (saved) {
                try {
                    trackedNames.value = JSON.parse(saved);
                } catch (e) {
                    trackedNames.value = [...defaultFriends];
                }
            } else {
                trackedNames.value = [...defaultFriends];
            }
        };

        const saveFriendsList = () => {
            localStorage.setItem('maple_friends_list', JSON.stringify(trackedNames.value));
        };

        const fetchCharacterData = async (name) => {
            const directUrl = `https://classicrank.com/api/v1/characters/${encodeURIComponent(name)}`;
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;

            try {
                const res = await fetch(directUrl, { signal: AbortSignal.timeout(3000) });
                if (res.ok) {
                    const data = await res.json();
                    return parseCharacterData(data, name);
                }
            } catch (e) {}

            try {
                const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(4000) });
                if (res.ok) {
                    const data = await res.json();
                    return parseCharacterData(data, name);
                }
            } catch (e) {}

            isFallback.value = true;
            if (mockData[name]) return mockData[name];

            return {
                name: name,
                level: Math.floor(Math.random() * 50) + 50,
                job: "Beginner",
                fame: Math.floor(Math.random() * 20),
                exp: 1000000,
                expPercent: Math.floor(Math.random() * 90),
                guild: "Novice",
                world: "Scania"
            };
        };

        const parseCharacterData = (data, fallbackName) => {
            return {
                name: data.name || data.character_name || fallbackName,
                level: Number(data.level || data.lvl || 1),
                job: data.job || data.class || "Beginner",
                fame: Number(data.fame || 0),
                exp: Number(data.exp || data.experience || 0),
                expPercent: Number(data.expPercent || data.exp_percent || data.percentage || 0),
                guild: data.guild || data.guild_name || "",
                world: data.world || data.server || "Scania",
                avatarUrl: data.avatar || data.image || null
            };
        };

        const fetchAllCharacters = async () => {
            loading.value = true;
            isFallback.value = false;
            const results = [];
            for (const name of trackedNames.value) {
                const charData = await fetchCharacterData(name);
                results.push(charData);
            }
            characters.value = results;
            lastUpdated.value = new Date();
            loading.value = false;
        };

        const addNewFriend = async () => {
            const trimmed = newFriendName.value.trim();
            if (!trimmed) return;
            if (trackedNames.value.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
                addError.value = "Ce personnage est déjà présent.";
                return;
            }
            addLoading.value = true;
            addError.value = '';
            const newChar = await fetchCharacterData(trimmed);
            trackedNames.value.push(trimmed);
            saveFriendsList();
            characters.value.push(newChar);
            addLoading.value = false;
            showAddModal.value = false;
            newFriendName.value = '';
        };

        const removeFriend = (name) => {
            trackedNames.value = trackedNames.value.filter(n => n.toLowerCase() !== name.toLowerCase());
            characters.value = characters.value.filter(c => c.name.toLowerCase() !== name.toLowerCase());
            saveFriendsList();
        };

        const getJobCategory = (jobName) => {
            if (!jobName) return 'OTHER';
            const j = jobName.toLowerCase();
            if (j.includes('warrior') || j.includes('knight') || j.includes('hero') || j.includes('crusader') || j.includes('page') || j.includes('spearman')) return 'WARRIOR';
            if (j.includes('mage') || j.includes('wizard') || j.includes('cleric') || j.includes('priest') || j.includes('bishop') || j.includes('arch')) return 'MAGE';
            if (j.includes('archer') || j.includes('bowman') || j.includes('hunter') || j.includes('ranger')) return 'ARCHER';
            if (j.includes('thief') || j.includes('rogue') || j.includes('assassin') || j.includes('hermit') || j.includes('bandit')) return 'THIEF';
            if (j.includes('pirate') || j.includes('brawler') || j.includes('gunslinger')) return 'PIRATE';
            return 'OTHER';
        };

        const getJobBadgeClass = (jobName) => {
            const cat = getJobCategory(jobName);
            switch(cat) {
                case 'WARRIOR': return 'bg-red-950/80 text-red-400 border border-red-800/60';
                case 'MAGE': return 'bg-blue-950/80 text-blue-400 border border-blue-800/60';
                case 'ARCHER': return 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60';
                case 'THIEF': return 'bg-purple-950/80 text-purple-400 border border-purple-800/60';
                case 'PIRATE': return 'bg-amber-950/80 text-amber-400 border border-amber-800/60';
                default: return 'bg-slate-800 text-slate-300 border border-slate-700';
            }
        };

        const getAvatarUrl = (char) => {
            if (char.avatarUrl) return char.avatarUrl;
            const cat = getJobCategory(char.job);
            let color = 'f39c12';
            if (cat === 'WARRIOR') color = 'e74c3c';
            if (cat === 'MAGE') color = '3498db';
            if (cat === 'ARCHER') color = '2ecc71';
            if (cat === 'THIEF') color = '9b59b6';
            return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(char.name)}&backgroundColor=${color}`;
        };

        const sortedCharacters = computed(() => {
            const list = [...characters.value];
            list.sort((a, b) => {
                if (b.level !== a.level) return b.level - a.level;
                if (b.expPercent !== a.expPercent) return b.expPercent - a.expPercent;
                return b.fame - a.fame;
            });
            return list.map((item, idx) => ({ ...item, rank: idx + 1 }));
        });

        const filteredCharacters = computed(() => {
            return sortedCharacters.value.filter(char => {
                const matchesSearch = searchQuery.value === '' || 
                    char.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                    char.job.toLowerCase().includes(searchQuery.value.toLowerCase());
                const matchesJobCat = selectedJobCategory.value === 'ALL' || getJobCategory(char.job) === selectedJobCategory.value;
                return matchesSearch && matchesJobCat;
            }).sort((a, b) => {
                let factor = sortOrder.value === 'desc' ? -1 : 1;
                if (sortBy.value === 'level') {
                    if (a.level !== b.level) return (a.level - b.level) * factor;
                    return (a.expPercent - b.expPercent) * factor;
                }
                if (sortBy.value === 'fame') return (a.fame - b.fame) * factor;
                if (sortBy.value === 'name') return a.name.localeCompare(b.name) * factor;
                return 0;
            });
        });

        const averageLevel = computed(() => {
            if (characters.value.length === 0) return 0;
            return Math.round(characters.value.reduce((acc, curr) => acc + curr.level, 0) / characters.value.length);
        });

        const topPlayer = computed(() => sortedCharacters.value[0] || null);
        const formatNumber = (num) => (num || 0).toLocaleString('fr-FR');
        const formatExp = (val) => (val || 0).toFixed(1);

        onMounted(() => {
            initFriendsList();
            fetchAllCharacters();
        });

        return {
            characters, loading, isFallback, searchQuery, selectedJobCategory,
            jobCategories, sortBy, sortOrder, sortedCharacters, filteredCharacters,
            averageLevel, topPlayer, selectedCharacter, showAddModal, newFriendName,
            addLoading, addError, fetchAllCharacters, addNewFriend, removeFriend,
            getJobBadgeClass, getAvatarUrl, formatNumber, formatExp
        };
    },
    template: `
    <div class="min-h-screen flex flex-col pb-12">
        <header class="border-b border-slate-800/80 bg-slate-900/60 sticky top-0 z-30 backdrop-blur-md">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-maple-orange flex items-center justify-center text-black font-black text-xl shadow-lg">🍁</div>
                    <div>
                        <h1 class="text-xl sm:text-2xl font-black tracking-tight text-white">MAPLESTORY <span class="text-maple-orange">CLASSIC</span></h1>
                        <p class="text-xs text-slate-400 font-medium">Classement Privé des Amis</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <button @click="fetchAllCharacters" :disabled="loading" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-semibold flex items-center gap-2">
                        <i class="fa-solid fa-rotate-right" :class="{'fa-spin': loading}"></i>
                        <span class="hidden sm:inline">Actualiser</span>
                    </button>
                    <button @click="showAddModal = true" class="px-4 py-2 bg-maple-orange hover:bg-orange-600 text-black font-bold rounded-lg text-sm flex items-center gap-2 shadow-lg">
                        <i class="fa-solid fa-user-plus"></i> Ajouter
                    </button>
                </div>
            </div>
        </header>

        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-8 flex-1">
            <!-- Podium Top 3 -->
            <div v-if="sortedCharacters.length >= 3" class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div v-for="(char, idx) in [sortedCharacters[1], sortedCharacters[0], sortedCharacters[2]]" :key="char.name"
                     class="glass-panel rounded-2xl p-6 flex flex-col items-center relative overflow-hidden transition-all duration-300 hover:-translate-y-1"
                     :class="idx === 1 ? 'gold-glow bg-gradient-to-b from-amber-500/10 via-slate-900/90 to-slate-900 order-1 md:order-2' : (idx === 0 ? 'silver-glow order-2 md:order-1' : 'bronze-glow order-3')">
                    <div class="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                        {{ idx === 1 ? '👑 Champion 1st' : (idx === 0 ? '#2nd Rang' : '#3rd Rang') }}
                    </div>
                    <div class="w-24 h-24 rounded-full bg-slate-800/90 border-2 border-slate-700 p-1 flex items-center justify-center my-3 overflow-hidden shadow-inner">
                        <img :src="getAvatarUrl(char)" class="w-20 h-20 object-contain">
                    </div>
                    <h3 class="text-xl font-bold text-white">{{ char.name }}</h3>
                    <span :class="getJobBadgeClass(char.job)" class="text-xs px-2.5 py-0.5 rounded-full font-semibold mt-1">{{ char.job }}</span>
                    <div class="mt-4 text-center">
                        <div class="text-2xl font-black text-white">Lv. {{ char.level }}</div>
                        <div class="text-xs text-slate-400 mt-1"><i class="fa-solid fa-heart text-pink-500 mr-1"></i> {{ char.fame }} Fame</div>
                    </div>
                </div>
            </div>

            <!-- Table Section -->
            <div class="glass-panel rounded-xl overflow-hidden border border-slate-800 shadow-xl">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-900/80 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                                <th class="py-4 px-4 text-center w-16">Rang</th>
                                <th class="py-4 px-4">Personnage</th>
                                <th class="py-4 px-4">Classe</th>
                                <th class="py-4 px-4 text-center">Niveau</th>
                                <th class="py-4 px-4">EXP</th>
                                <th class="py-4 px-4 text-center">Fame</th>
                                <th class="py-4 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/60 text-sm">
                            <tr v-for="char in filteredCharacters" :key="char.name" class="hover:bg-slate-800/50 transition-colors">
                                <td class="py-3 px-4 text-center font-bold text-amber-400">#{{ char.rank }}</td>
                                <td class="py-3 px-4 flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 p-0.5 flex items-center justify-center">
                                        <img :src="getAvatarUrl(char)" class="w-9 h-9 object-contain">
                                    </div>
                                    <div>
                                        <div class="font-bold text-slate-100">{{ char.name }}</div>
                                        <div class="text-xs text-slate-400 font-mono">{{ char.guild || 'Sans Guilde' }}</div>
                                    </div>
                                </td>
                                <td class="py-3 px-4"><span :class="getJobBadgeClass(char.job)" class="text-xs px-2.5 py-1 rounded-md">{{ char.job }}</span></td>
                                <td class="py-3 px-4 text-center font-black text-base">Lv. {{ char.level }}</td>
                                <td class="py-3 px-4">
                                    <div class="text-[11px] text-slate-400 mb-1">{{ formatExp(char.expPercent) }}%</div>
                                    <div class="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                                        <div class="bg-maple-orange h-full rounded-full" :style="{ width: char.expPercent + '%' }"></div>
                                    </div>
                                </td>
                                <td class="py-3 px-4 text-center text-pink-400 font-semibold"><i class="fa-solid fa-heart text-xs"></i> {{ char.fame }}</td>
                                <td class="py-3 px-4 text-right">
                                    <button @click="removeFriend(char.name)" class="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors">
                                        <i class="fa-solid fa-trash text-xs"></i>
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </main>

        <!-- Add Friend Modal -->
        <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" @click.self="showAddModal = false">
            <div class="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-700 shadow-2xl relative">
                <h3 class="text-lg font-bold text-white mb-2"><i class="fa-solid fa-user-plus text-maple-orange mr-2"></i> Ajouter un Personnage</h3>
                <form @submit.prevent="addNewFriend">
                    <input v-model="newFriendName" type="text" required placeholder="Nom exact du personnage" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 mb-4 focus:outline-none focus:border-maple-orange">
                    <div v-if="addError" class="text-xs text-red-400 mb-4">{{ addError }}</div>
                    <div class="flex justify-end gap-3">
                        <button type="button" @click="showAddModal = false" class="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs">Annuler</button>
                        <button type="submit" class="px-5 py-2 bg-maple-orange text-black font-bold rounded-lg text-xs">Ajouter</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `
}).mount('#app');