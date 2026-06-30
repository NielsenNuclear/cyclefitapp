"use client";

/**
 * useBodyInteraction
 *
 * Manages hover and selection state for the body viewer.
 * No rendering code. No business logic.
 * Provides stable callbacks suitable for passing into the Canvas.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { MuscleRecord } from "@/lib/bodyIntelligence/BodyStateEngine";

export interface InteractionState {
  hovered:    MuscleRecord | null;
  selected:   MuscleRecord | null;
  hoveredId:  string | null;
  selectedId: string | null;
}

export interface InteractionHandlers {
  onHover:    (id: string | null) => void;
  onSelect:   (id: string | null) => void;
  onDeselect: () => void;
  onReset:    () => void;
}

export type UseBodyInteractionResult = InteractionState & InteractionHandlers;

export function useBodyInteraction(muscleMap: Map<string, MuscleRecord>): UseBodyInteractionResult {
  const [hoveredId,  setHoveredId]  = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const muscleMapRef = useRef(muscleMap);
  muscleMapRef.current = muscleMap;

  const onHover = useCallback((id: string | null) => {
    setHoveredId(id);
    document.body.style.cursor = id ? "pointer" : "default";
  }, []);

  const onSelect = useCallback((id: string | null) => {
    setSelectedId(prev => (prev === id ? null : id)); // toggle
  }, []);

  const onDeselect = useCallback(() => {
    setSelectedId(null);
  }, []);

  const onReset = useCallback(() => {
    setHoveredId(null);
    setSelectedId(null);
    document.body.style.cursor = "default";
  }, []);

  // Keyboard: Escape deselects, Tab/arrow cycles (future)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onDeselect();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDeselect]);

  // Cursor cleanup on unmount
  useEffect(() => () => { document.body.style.cursor = "default"; }, []);

  const hovered  = hoveredId  ? (muscleMapRef.current.get(hoveredId)  ?? null) : null;
  const selected = selectedId ? (muscleMapRef.current.get(selectedId) ?? null) : null;

  return {
    hovered, selected, hoveredId, selectedId,
    onHover, onSelect, onDeselect, onReset,
  };
}
