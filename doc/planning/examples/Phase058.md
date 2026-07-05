# Phase 058: SilveredBulwarkScroll Mod

**Status:** IMPLEMENTED
**Date:** 2026-02-20

---

## Goals

1. **Create SilveredBulwarkScroll mod:** Set up the full mod directory structure with `meta.lsx`, localization, stats, and RootTemplates directories.
2. **Copy the Silvered Bulwark spell:** Define `SBS_Target_SilveredBulwark` as a standalone copy of `L21_Target_SilveredBulwark` (no dependency on Level21Gear).
3. **Create the scroll:** Define `OBJ_SBS_Scroll_SilveredBulwark` (Stats) and `SBS_Scroll_SilveredBulwark` (RootTemplate) with `OnUsePeaceActions` casting `SBS_Target_SilveredBulwark`.
4. **Deliver via Tutorial Chest:** Inject one copy into `TUT_Chest_Potions` via TreasureTable.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Standalone vs. Level21Gear dependency | **Standalone** | Players don't need Level21Gear installed; scroll works independently |
| Unique | **No** (`Unique "0"`) | Scroll is consumable; players may want multiple copies |
| Delivery | Tutorial Chest (`TUT_Chest_Potions`) | Standard delivery for new mods in this project |
| Item/spell prefix | `SBS_` | SilveredBulwarkScroll abbreviation |
| UUID prefix | `ed58` | Valid hex; follows ed13/ed21 convention |

---

## Source Reference

The scroll and spell are copied from the Level21Gear implementation (Phase 057):

**Source spell** (`L21_Target_SilveredBulwark` in `Level21Gear/Public/Level21Gear/Stats/Generated/Data/Spell_Target.txt`):
```
new entry "L21_Target_SilveredBulwark"
type "SpellData"
data "SpellType" "Target"
using "Target_GlobeOfInvulnerability"
data "Level" "6"
data "SpellSchool" "Abjuration"
data "SpellProperties" "AI_ONLY:ApplyStatus(SELF,AI_HELPER_BUFF_LARGE,100,30);AI_IGNORE:ApplyStatus(LOW_RAMAZITHSTOWER_NIGHTSONG_GLOBE_1,100,-1)"
data "TargetRadius" "18"
data "AreaRadius" ""
data "TargetConditions" "not HasStatus('LOW_RAMAZITHSTOWER_NIGHTSONG_GLOBE_1')"
data "Icon" "Spell_Abjuration_GlobeOfInvulnerability"
data "TooltipStatusApply" "ApplyStatus(LOW_RAMAZITHSTOWER_NIGHTSONG_GLOBE_FUNCTIONAL_AURA,100,-1)"
data "CastSound" "Spell_Cast_Control_GlobeOfInvulnerability_L6to8"
data "TargetSound" "Spell_Impact_Control_GlobeOfInvulnerability_L6to8"
data "PreviewCursor" "Cast"
data "CastTextEvent" "Cast"
data "UseCosts" "BonusActionPoint:1"
data "SpellAnimation" "554a18f7-952e-494a-b301-7702a85d4bc9,,;,,;ab7b6aac-b3c9-4918-8f17-f777a94dcb5e,,;57211a11-ed0b-46d7-9369-81df25a85df6,,;22dfbbf4-f417-4c84-b39e-2039315961e6,,;,,;5bfbe9f9-4fc3-4f26-b112-43d404db6a89,,;,,;,,"
data "VerbalIntent" "Buff"
data "SpellFlags" "HasVerbalComponent;HasSomaticComponent;IsConcentration;IsSpell"
data "HitAnimationType" "MagicalNonDamage"
data "SpellAnimationIntentType" "Aggressive"
data "Sheathing" "DontChange"
```

**Source scroll RootTemplate pattern** (from `Level21Gear/Public/Level21Gear/RootTemplates/L21_Scroll_SilveredBulwark.lsf.lsx` — established in Phase 057 Revision 1):
- `ParentTemplateId`: `4ffd5c4b-4c56-4f05-a228-a33754bb1806` (generic scroll base)
- Two `OnUsePeaceActions` children: ActionType 12 (skill check) and ActionType 33 (cast)

---

## Implementation Plan

### Task 1: Mod Directory Structure and meta.lsx

Create the full directory layout for SilveredBulwarkScroll and the mod metadata file.

**File to create:** `SilveredBulwarkScroll/Mods/SilveredBulwarkScroll/meta.lsx`

```xml
<?xml version="1.0" encoding="utf-8"?>
<save>
  <version major="4" minor="0" revision="9" build="331" />
  <region id="Config">
    <node id="root">
      <children>
        <node id="Dependencies" />
        <node id="ModuleInfo">
          <attribute id="Author" type="LSString" value="PseudonymousEd" />
          <attribute id="CharacterCreationLevelName" type="FixedString" value="" />
          <attribute id="Description" type="LSString" value="A spell scroll that casts Silvered Bulwark, granting an ally invulnerability." />
          <attribute id="Folder" type="LSString" value="SilveredBulwarkScroll" />
          <attribute id="LobbyLevelName" type="FixedString" value="" />
          <attribute id="MD5" type="LSString" value="" />
          <attribute id="MainMenuBackgroundVideo" type="FixedString" value="" />
          <attribute id="MenuLevelName" type="FixedString" value="" />
          <attribute id="Name" type="LSString" value="Silvered Bulwark Scroll" />
          <attribute id="NumPlayers" type="uint8" value="4" />
          <attribute id="PhotoBoothLevelName" type="FixedString" value="" />
          <attribute id="StartupLevelName" type="FixedString" value="" />
          <attribute id="Tags" type="LSString" value="" />
          <attribute id="Type" type="FixedString" value="Add-on" />
          <attribute id="UUID" type="FixedString" value="[MOD_UUID]" />
          <attribute id="Version64" type="int64" value="36028919425531905" />
          <children>
            <node id="PublishVersion">
              <attribute id="Version64" type="int64" value="36028919425531905" />
            </node>
            <node id="Scripts" />
            <node id="TargetModes">
              <children>
                <node id="Target">
                  <attribute id="Object" type="FixedString" value="Story" />
                </node>
              </children>
            </node>
          </children>
        </node>
      </children>
    </node>
  </region>
</save>
```

### Task 2: Spell Stats Entry

Create `SilveredBulwarkScroll/Public/SilveredBulwarkScroll/Stats/Generated/Data/Spell_Target.txt`:

```
new entry "SBS_Target_SilveredBulwark"
type "SpellData"
data "SpellType" "Target"
using "Target_GlobeOfInvulnerability"
data "Level" "6"
data "SpellSchool" "Abjuration"
data "SpellProperties" "AI_ONLY:ApplyStatus(SELF,AI_HELPER_BUFF_LARGE,100,30);AI_IGNORE:ApplyStatus(LOW_RAMAZITHSTOWER_NIGHTSONG_GLOBE_1,100,-1)"
data "TargetRadius" "18"
data "AreaRadius" ""
data "TargetConditions" "not HasStatus('LOW_RAMAZITHSTOWER_NIGHTSONG_GLOBE_1')"
data "Icon" "Spell_Abjuration_GlobeOfInvulnerability"
data "DisplayName" "[SBS_SPELL_NAME_HANDLE];1"
data "Description" "[SBS_SPELL_DESC_HANDLE];1"
data "TooltipStatusApply" "ApplyStatus(LOW_RAMAZITHSTOWER_NIGHTSONG_GLOBE_FUNCTIONAL_AURA,100,-1)"
data "CastSound" "Spell_Cast_Control_GlobeOfInvulnerability_L6to8"
data "TargetSound" "Spell_Impact_Control_GlobeOfInvulnerability_L6to8"
data "PreviewCursor" "Cast"
data "CastTextEvent" "Cast"
data "UseCosts" "BonusActionPoint:1"
data "SpellAnimation" "554a18f7-952e-494a-b301-7702a85d4bc9,,;,,;ab7b6aac-b3c9-4918-8f17-f777a94dcb5e,,;57211a11-ed0b-46d7-9369-81df25a85df6,,;22dfbbf4-f417-4c84-b39e-2039315961e6,,;,,;5bfbe9f9-4fc3-4f26-b112-43d404db6a89,,;,,;,,"
data "VerbalIntent" "Buff"
data "SpellFlags" "HasVerbalComponent;HasSomaticComponent;IsConcentration;IsSpell"
data "HitAnimationType" "MagicalNonDamage"
data "SpellAnimationIntentType" "Aggressive"
data "Sheathing" "DontChange"
```

### Task 3: Scroll Stats Entry

Create `SilveredBulwarkScroll/Public/SilveredBulwarkScroll/Stats/Generated/Data/Object.txt`:

```
new entry "OBJ_SBS_Scroll_SilveredBulwark"
type "Object"
using "_MagicScroll"
data "RootTemplate" "[SCROLL_ROOT_UUID]"
data "DisplayName" "[SBS_SCROLL_NAME_HANDLE];1"
data "Description" "[SBS_SCROLL_DESC_HANDLE];1"
data "ValueLevel" "6"
data "Rarity" "Rare"
data "Priority" "1"
```

### Task 4: Scroll RootTemplate

Create `SilveredBulwarkScroll/Public/SilveredBulwarkScroll/RootTemplates/SBS_Scroll_SilveredBulwark.lsf.lsx`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<save>
    <version major="4" minor="0" revision="6" build="5" lslib_meta="v1,bswap_guids" />
    <region id="Templates">
        <node id="Templates">
            <children>
                <node id="GameObjects">
                    <attribute id="Description" type="TranslatedString" handle="[SBS_SCROLL_DESC_HANDLE]" version="1" />
                    <attribute id="DisplayName" type="TranslatedString" handle="[SBS_SCROLL_NAME_HANDLE]" version="1" />
                    <attribute id="LevelName" type="FixedString" value="" />
                    <attribute id="MapKey" type="FixedString" value="[SCROLL_ROOT_UUID]" />
                    <attribute id="Name" type="LSString" value="SBS_Scroll_SilveredBulwark" />
                    <attribute id="ParentTemplateId" type="FixedString" value="4ffd5c4b-4c56-4f05-a228-a33754bb1806" />
                    <attribute id="Stats" type="FixedString" value="OBJ_SBS_Scroll_SilveredBulwark" />
                    <attribute id="Type" type="FixedString" value="item" />
                    <attribute id="_OriginalFileVersion_" type="int64" value="144115188075855912" />
                    <children>
                        <node id="GameMaster" />
                        <node id="OnUsePeaceActions">
                            <children>
                                <node id="Action">
                                    <attribute id="ActionType" type="int32" value="12" />
                                    <children>
                                        <node id="Attributes">
                                            <attribute id="Animation" type="FixedString" value="" />
                                            <attribute id="ClassId" type="guid" value="a865965f-501b-46e9-9eaa-7748e8c04d09" />
                                            <attribute id="Conditions" type="LSString" value="" />
                                            <attribute id="Consume" type="bool" value="True" />
                                            <attribute id="SkillID" type="FixedString" value="SBS_Target_SilveredBulwark" />
                                        </node>
                                    </children>
                                </node>
                                <node id="Action">
                                    <attribute id="ActionType" type="int32" value="33" />
                                    <children>
                                        <node id="Attributes">
                                            <attribute id="Animation" type="FixedString" value="" />
                                            <attribute id="Conditions" type="LSString" value="" />
                                            <attribute id="Consume" type="bool" value="True" />
                                            <attribute id="SpellId" type="FixedString" value="SBS_Target_SilveredBulwark" />
                                        </node>
                                    </children>
                                </node>
                            </children>
                        </node>
                    </children>
                </node>
            </children>
        </node>
    </region>
</save>
```

### Task 5: TreasureTable

Create `SilveredBulwarkScroll/Public/SilveredBulwarkScroll/Stats/Generated/TreasureTable.txt`:

```
new treasuretable "TUT_Chest_Potions"
 CanMerge 1
new subtable "1,1"
object category "I_OBJ_SBS_Scroll_SilveredBulwark",1,0,0,0,0,0,0,0
```

### Task 6: Localization

Create `SilveredBulwarkScroll/Localization/English/SilveredBulwarkScroll.loca.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<contentList>
    <!-- Silvered Bulwark Spell -->
    <content contentuid="[SBS_SPELL_NAME_HANDLE]" version="1">Silvered Bulwark</content>
    <content contentuid="[SBS_SPELL_DESC_HANDLE]" version="1">Encase an ally in a radiant shield of invulnerability. The target becomes completely immune to all damage and gains advantage on all saving throws. The protective aura follows the target as they move.</content>

    <!-- Silvered Bulwark Scroll -->
    <content contentuid="[SBS_SCROLL_NAME_HANDLE]" version="1">Scroll of Silvered Bulwark</content>
    <content contentuid="[SBS_SCROLL_DESC_HANDLE]" version="1">A scroll inscribed with the Silvered Bulwark invocation. Encase an ally in a radiant shield of invulnerability. Single use.</content>
</contentList>
```

---

## Files to Create

| File | Description |
|------|-------------|
| `SilveredBulwarkScroll/Mods/SilveredBulwarkScroll/meta.lsx` | Mod metadata |
| `SilveredBulwarkScroll/Public/SilveredBulwarkScroll/Stats/Generated/Data/Spell_Target.txt` | `SBS_Target_SilveredBulwark` spell |
| `SilveredBulwarkScroll/Public/SilveredBulwarkScroll/Stats/Generated/Data/Object.txt` | `OBJ_SBS_Scroll_SilveredBulwark` scroll stats |
| `SilveredBulwarkScroll/Public/SilveredBulwarkScroll/RootTemplates/SBS_Scroll_SilveredBulwark.lsf.lsx` | Scroll RootTemplate with `OnUsePeaceActions` |
| `SilveredBulwarkScroll/Public/SilveredBulwarkScroll/Stats/Generated/TreasureTable.txt` | Inject scroll into `TUT_Chest_Potions` |
| `SilveredBulwarkScroll/Localization/English/SilveredBulwarkScroll.loca.xml` | Spell and scroll names/descriptions |

---

## UUID/Handle Requirements

### UUID Convention for SilveredBulwarkScroll

SilveredBulwarkScroll uses the **`ed58`** UUID prefix. Take UUIDs from the pool in `docs/instructions/uuid_workflow.md`, replace the first 4 characters with `ed58`.

**Handle format:** `h` + UUID with `-` replaced by `g`
- Example UUID: `ed58xxxx-yyyy-zzzz-aaaa-bbbbbbbbbbbb`
- Example handle: `hed58xxxxgyyyygzzzzgaaaagbbbbbbbbbbbb`

### Estimated UUIDs Needed

| Purpose | Count |
|---------|-------|
| Mod UUID (meta.lsx) | 1 |
| Scroll RootTemplate UUID | 1 |
| Spell DisplayName handle | 1 |
| Spell Description handle | 1 |
| Scroll DisplayName handle | 1 |
| Scroll Description handle | 1 |
| **Total** | **6** |

### UUID Allocation

*Fill in during implementation.*

| Purpose | UUID / Handle | Value |
|---------|---------------|-------|
| Mod UUID | UUID | `ed58126e-8531-43ce-93f2-8b4b49354e12` |
| Scroll RootTemplate | UUID | `ed583900-31d6-4628-8073-44a00b243c80` |
| Spell DisplayName | Handle | `hed581091gce8fg4ed5g94f4g2c34676295f2` |
| Spell Description | Handle | `hed58588cg8b6ag477bg80cag8157a7688868` |
| Scroll DisplayName | Handle | `hed58b27dgbdf8g4a49ga202g90258d1cd5c8` |
| Scroll Description | Handle | `hed589505g7e4ag4502g89ccg468ad628159c` |

---

## Testing Plan

### Test 1: Scroll in Tutorial Chest
1. Start a new game (Tutorial Chest must be unopened).
2. Open the Tutorial Chest.
3. **Verify:** "Scroll of Silvered Bulwark" appears in the chest.
4. **Verify:** The scroll has the correct name and description.

### Test 2: Scroll Casts Correct Spell
1. Use the Scroll of Silvered Bulwark on an ally.
2. **Verify:** The scroll is consumed after use.
3. **Verify:** The target receives the Silvered Bulwark invulnerability effect (`LOW_RAMAZITHSTOWER_NIGHTSONG_GLOBE_1` status).
4. **Verify:** The aura follows the target as they move.

### Test 3: Standalone (No Level21Gear)
1. Ensure Level21Gear is NOT enabled.
2. Enable only SilveredBulwarkScroll.
3. **Verify:** The mod loads without errors.
4. **Verify:** The scroll appears and functions correctly.

---

## Technical Notes

### Scroll RootTemplate Pattern (Verified in Phase 057)
The `OnUsePeaceActions` structure is required to link the scroll to its spell. Using a specific vanilla spell scroll as `ParentTemplateId` causes that spell to be cast instead. Always use the generic scroll base `4ffd5c4b-4c56-4f05-a228-a33754bb1806` as parent.

See: `docs/instructions/interesting_magical_effects.md` — "Creating a Custom Scroll" section.

### No Dependency on Level21Gear
`SBS_Target_SilveredBulwark` is a full copy of `L21_Target_SilveredBulwark`. The mod works without Level21Gear installed.

### Unique = 0
The scroll is not unique. Multiple copies can appear if the TreasureTable is rolled multiple times (e.g. in a new game). This is intentional — it's a consumable item.

---

## Dependencies

**This phase depends on:**
- Phase 057 (COMPLETE) — Scroll RootTemplate pattern established and verified.

**This phase has no dependency on:**
- Level21Gear mod — `SBS_Target_SilveredBulwark` is a standalone copy.

---

## Success Criteria

- [ ] `SilveredBulwarkScroll/Mods/SilveredBulwarkScroll/meta.lsx` created
- [ ] `Spell_Target.txt` created with `SBS_Target_SilveredBulwark`
- [ ] `Object.txt` created with `OBJ_SBS_Scroll_SilveredBulwark`
- [ ] `SBS_Scroll_SilveredBulwark.lsf.lsx` created with correct UUID and `OnUsePeaceActions`
- [ ] `TreasureTable.txt` created, injecting scroll into `TUT_Chest_Potions`
- [ ] `SilveredBulwarkScroll.loca.xml` created with 4 handles
- [ ] 6 UUIDs consumed from pool and deleted from `uuid_workflow.md`
- [ ] Scroll appears in Tutorial Chest in-game
- [ ] Scroll casts Silvered Bulwark correctly
- [ ] Mod works standalone without Level21Gear
- [ ] User-tested and confirmed

---

## Related Documentation

- **`docs/silveredbulwarkscroll/item_catalog.md`** — Item catalog for this mod
- **`docs/instructions/uuid_workflow.md`** — UUID pool; use `ed58` prefix for SilveredBulwarkScroll
- **`docs/instructions/interesting_magical_effects.md`** — Custom scroll RootTemplate structure (verified pattern)
- **`docs/phases/Phase057.md`** — Source scroll and spell (L21_Scroll_SilveredBulwark / L21_Target_SilveredBulwark)

---

## Phase 058 Status: IMPLEMENTED

---
