<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte'
  import Card from '$lib/components/ui/card/card.svelte'
  import Input from '$lib/components/ui/input/input.svelte'
  import Separator from '$lib/components/ui/separator/separator.svelte'
  import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-svelte'
  import { onMount } from 'svelte'

  const widgetStoragePath = 'widget_data.internal_pet_food_calculator'
  const formatter = new Intl.NumberFormat('de-DE')
  function parseFormatted(value: string): number {
    return parseFloat(value.replaceAll('.', '').replace(',', '.')) || 0
  }
  const petTiersList = [
    { value: 'egg', label: 'Egg', image: 'pets/egg.png' },
    { value: 'f', label: 'F', image: 'pets/tier_f.png' },
    { value: 'e', label: 'E', image: 'pets/tier_e.png' },
    { value: 'd', label: 'D', image: 'pets/tier_d.png' },
    { value: 'c', label: 'C', image: 'pets/tier_c.png' },
    { value: 'b', label: 'B', image: 'pets/tier_b.png' },
    { value: 'a', label: 'A', image: 'pets/tier_a.png' },
    { value: 's', label: 'S', image: 'pets/tier_s.png' }
  ]

  let currentTier = 0
  let currentExp = 0
  let targetTier = 1

  const candyCost = {
    f: 200000,
    e: 500000,
    d: 800000,
    c: 1000000,
    b: 1500000,
    a: 2500000
  }

  const petTiers = {
    egg: {
      f: 10
    },
    f: {
      f: 20
    },
    e: {
      e: 20
    },
    d: {
      d: 25
    },
    c: {
      c: 25
    },
    b: {
      b: 25
    },
    a: {
      a: 50
    },
    s: {}
  }

  let berryPrices = {
    cloud: 0,
    light: 0,
    exo: 0
  }

  function incrementCurrentTier() {
    currentTier++
    if (targetTier <= currentTier) {
      targetTier = currentTier + 1
    }
  }

  let candyNeeded = {
    f: 0,
    e: 0,
    d: 0,
    c: 0,
    b: 0,
    a: 0
  }

  let berriesNeeded = {
    cloud: 0,
    light: 0,
    exo: 0
  }

  let penyaNeeded = 0

  function calcCandyNeeded(candyTier: string) {
    let totalNeeded = 0
    switch (candyTier) {
      case 'f':
        if (currentTier == 0 || currentTier == 1) {
          let remainingExp = 100 - currentExp
          let expPerCandy = 100 / petTiers.f.f
          if (currentTier == 0) {
            totalNeeded = remainingExp / (100 / petTiers.egg.f)
            if (targetTier >= 2) {
              totalNeeded += petTiers.f.f
            }
          } else {
            totalNeeded = remainingExp / expPerCandy
          }
        }
        break
      case 'e':
        if (targetTier >= 3 && currentTier < 3) {
          let remainingExp = currentTier == 2 ? 100 - currentExp : 100
          let expPerCandy = 100 / petTiers.e.e
          totalNeeded = remainingExp / expPerCandy
        }
        break
      case 'd':
        if (targetTier >= 4 && currentTier < 4) {
          let remainingExp = currentTier == 3 ? 100 - currentExp : 100
          let expPerCandy = 100 / petTiers.d.d
          totalNeeded = remainingExp / expPerCandy
        }
        break
      case 'c':
        if (targetTier >= 5 && currentTier < 5) {
          let remainingExp = currentTier == 4 ? 100 - currentExp : 100
          let expPerCandy = 100 / petTiers.c.c
          totalNeeded = remainingExp / expPerCandy
        }
        break
      case 'b':
        if (targetTier >= 6 && currentTier < 6) {
          let remainingExp = currentTier == 5 ? 100 - currentExp : 100
          let expPerCandy = 100 / petTiers.b.b
          totalNeeded = remainingExp / expPerCandy
        }
        break
      case 'a':
        if (targetTier >= 7 && currentTier < 7) {
          let remainingExp = currentTier == 6 ? 100 - currentExp : 100
          let expPerCandy = 100 / petTiers.a.a
          totalNeeded = remainingExp / expPerCandy
        }
        break
    }

    return totalNeeded
  }

  function calcBerriesNeeded(berryType: string) {
    let total = 0
    switch (berryType) {
      case 'cloud':
        total += (candyNeeded.a + candyNeeded.b + candyNeeded.c + candyNeeded.d) * 75
        total += candyNeeded.e * 75 + candyNeeded.f * 25
        break
      case 'light':
        total += candyNeeded.a * 150
        total += candyNeeded.b * 150
        total += candyNeeded.c * 100
        total += candyNeeded.d * 50
        break
      case 'exo':
        total += candyNeeded.a * 100
        break
    }

    return total
  }

  function recalculateBerries() {
    berriesNeeded.cloud = calcBerriesNeeded('cloud')
    berriesNeeded.light = calcBerriesNeeded('light')
    berriesNeeded.exo = calcBerriesNeeded('exo')
  }

  function recalculateCandies() {
    candyNeeded.f = calcCandyNeeded('f')
    candyNeeded.e = calcCandyNeeded('e')
    candyNeeded.d = calcCandyNeeded('d')
    candyNeeded.c = calcCandyNeeded('c')
    candyNeeded.b = calcCandyNeeded('b')
    candyNeeded.a = calcCandyNeeded('a')
    recalculateBerries()
    recalculatePenya()
  }

  function recalculatePenya() {
    penyaNeeded =
      candyNeeded.f * candyCost.f +
      candyNeeded.e * (candyCost.f + candyCost.e) +
      candyNeeded.d * (candyCost.f + candyCost.e + candyCost.d) +
      candyNeeded.c * (candyCost.f + candyCost.e + candyCost.d + candyCost.c) +
      candyNeeded.b * (candyCost.f + candyCost.e + candyCost.d + candyCost.c + candyCost.b) +
      candyNeeded.a *
        (candyCost.a + candyCost.f + candyCost.e + candyCost.d + candyCost.c + candyCost.b)
  }

  onMount(() => {
    recalculateCandies()
    berryPrices.cloud = parseInt(
      localStorage.getItem(widgetStoragePath + '.berryPrices.cloud') ?? '0'
    )
    berryPrices.light = parseInt(
      localStorage.getItem(widgetStoragePath + '.berryPrices.light') ?? '0'
    )
    berryPrices.exo = parseInt(localStorage.getItem(widgetStoragePath + '.berryPrices.exo') ?? '0')
  })

  function handleBerryPrice(beryType: string, e: Event) {
    let target = e.target as HTMLInputElement
    switch (beryType) {
      case 'cloud':
        berryPrices.cloud = parseFormatted(target.value)
        target.value = formatter.format(berryPrices.cloud)
        localStorage.setItem(widgetStoragePath + '.berryPrices.cloud', berryPrices.cloud.toString())
        break
      case 'light':
        berryPrices.light = parseFormatted(target.value)
        target.value = formatter.format(berryPrices.light)
        localStorage.setItem(widgetStoragePath + '.berryPrices.light', berryPrices.light.toString())
        break
      case 'exo':
        berryPrices.exo = parseFormatted(target.value)
        target.value = formatter.format(berryPrices.exo)
        localStorage.setItem(widgetStoragePath + '.berryPrices.exo', berryPrices.exo.toString())
        break
    }
  }
</script>

<div class="flex flex-col gap-1">
  <div class="flex items-center gap-2">
    <div class="flex flex-col gap-2">
      <Button
        variant="outline"
        size="sm"
        class="w-5 h-5 p-1"
        on:click={() => {
          incrementCurrentTier()
          recalculateCandies()
        }}
        disabled={currentTier >= petTiersList.length - 2}
      >
        <ChevronUp class="h-4" /></Button
      >
      <Button
        variant="outline"
        size="sm"
        class="w-5 h-5 p-1"
        on:click={() => {
          currentTier--
          recalculateCandies()
        }}
        disabled={currentTier <= 0}
      >
        <ChevronDown class="h-4" /></Button
      >
    </div>
    <Card
      class="overflow-hidden w-10 h-10 select-none pointer-events-none items-center justify-center flex"
    >
      <img
        class="w-3/4"
        src={petTiersList[currentTier].image}
        alt={petTiersList[currentTier].label}
      />
    </Card>
    <div class="flex relative items-center gap-2">
      <Input
        type="number"
        on:change={() => {
          currentExp = currentExp > 100 ? 100 : currentExp < 0 ? 0 : currentExp
          recalculateCandies()
        }}
        on:input={() => {
          currentExp = currentExp > 100 ? 100 : currentExp < 0 ? 0 : currentExp
          recalculateCandies()
        }}
        bind:value={currentExp}
        min={0}
        max={100}
        step={100 / Object.values(Object.values(petTiers)[currentTier])[0]}
        class="w-24 pl-8"
      />
      <strong class="absolute left-3">%</strong>
    </div>

    <div class="flex flex-1 items-center justify-center">
      <ChevronRight />
    </div>

    <Card
      class="overflow-hidden w-10 h-10 select-none pointer-events-none items-center justify-center flex"
    >
      <img
        class="w-3/4"
        src={petTiersList[targetTier].image}
        alt={petTiersList[targetTier].label}
      />
    </Card>
    <div class="flex flex-col gap-2">
      <Button
        variant="outline"
        size="sm"
        class="w-5 h-5 p-1"
        on:click={() => {
          targetTier++
          recalculateCandies()
        }}
        disabled={targetTier >= petTiersList.length - 1}
      >
        <ChevronUp class="h-4" /></Button
      >
      <Button
        variant="outline"
        size="sm"
        class="w-5 h-5 p-1"
        on:click={() => {
          targetTier--
          recalculateCandies()
        }}
        disabled={targetTier <= 1 || currentTier + 1 == targetTier}
      >
        <ChevronDown class="h-4" /></Button
      >
    </div>
  </div>
  <Separator class="my-2" />
  <div class="flex gap-2 justify-around">
    <div class="flex flex-col items-center justify-center">
      <img src="pets/candy_f.png" class="w-8 h-8" /><b>{candyNeeded.f}</b>
    </div>
    <div class="flex flex-col items-center justify-center">
      <img src="pets/candy_e.png" class="w-8 h-8" /><b>{candyNeeded.e}</b>
    </div>
    <div class="flex flex-col items-center justify-center">
      <img src="pets/candy_d.png" class="w-8 h-8" /><b>{candyNeeded.d}</b>
    </div>
    <div class="flex flex-col items-center justify-center">
      <img src="pets/candy_c.png" class="w-8 h-8" /><b>{candyNeeded.c}</b>
    </div>
    <div class="flex flex-col items-center justify-center">
      <img src="pets/candy_b.png" class="w-8 h-8" /><b>{candyNeeded.b}</b>
    </div>
    <div class="flex flex-col items-center justify-center">
      <img src="pets/candy_a.png" class="w-8 h-8" /><b>{candyNeeded.a}</b>
    </div>
  </div>
  <Separator class="my-2" />
  <div class="flex flex-col gap-2 justify-around">
    <div class="flex gap-2 items-center">
      <img src="pets/cloud_berry.png" class="w-8 h-8" /><b>{berriesNeeded.cloud}</b>
      <div class="flex-grow"></div>
      <div class="flex items-center w-1/2 gap-2">
        <Input
          value={formatter.format(berryPrices.cloud)}
          on:input={(e) => {
            handleBerryPrice('cloud', e)
          }}
        /> <img src="pets/perin.webp" class="w-3 h-3" />
      </div>
    </div>
    <div class="flex gap-2 items-center">
      <img src="pets/light_berry.png" class="w-8 h-8" /><b>{berriesNeeded.light}</b>
      <div class="flex-grow"></div>
      <div class="flex items-center w-1/2 gap-2">
        <Input
          value={formatter.format(berryPrices.light)}
          on:input={(e) => {
            handleBerryPrice('light', e)
          }}
        /> <img src="pets/perin.webp" class="w-3 h-3" />
      </div>
    </div>
    <div class="flex gap-2 items-center">
      <img src="pets/exo_berry.png" class="w-8 h-8" /><b>{berriesNeeded.exo}</b>
      <div class="flex-grow"></div>
      <div class="flex items-center w-1/2 gap-2">
        <Input
          value={formatter.format(berryPrices.exo)}
          on:input={(e) => {
            handleBerryPrice('exo', e)
          }}
        /> <img src="pets/perin.webp" class="w-3 h-3" />
      </div>
    </div>
  </div>
  <Separator class="my-2" />
  <div class="flex justify-end items-center gap-2 font-bold">
    {formatter.format(
      penyaNeeded +
        berriesNeeded.cloud * berryPrices.cloud +
        berriesNeeded.light * berryPrices.light +
        berriesNeeded.exo * berryPrices.exo
    )}
    <img src="pets/perin.webp" class="w-5 h-5" />
  </div>
</div>
