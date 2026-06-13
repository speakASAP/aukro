# Project Knowledge Graph Schema

## Purpose

Record traceability between goals, systems, features, tasks, plans, context, prompts and validation.

## Node types

Goal, System, Subsystem, Feature, Task, ExecutionPlan, ContextPackage, CodingPrompt, ValidationReport, ADR.

## Edge types

implements, impacts_goal, derives_from, generates, included_in_context, validates, constrained_by.

## Required relationships

Tasks impact goals and implement features. Plans derive from tasks and are constrained by ADRs. Prompts derive from plans and are included in context. Validation reports validate tasks or plans.

## Graph completeness rules

Each implementation task needs path-backed nodes and required edges.

## Context retrieval rule

Use graph links to choose the smallest relevant task context.
