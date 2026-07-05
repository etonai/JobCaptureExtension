# Project Guide

This file provides context for the project.

It should be read at the start of work by anyone contributing to the project, including AI agents working with limited or no prior context.

## Planning

For the project planning and development workflow, read:

`doc/planning/DevelopmentProcess.md`

## Agent Constraints

These rules apply to all agents working in this project and override any default behavior.

### Git Commands

Agents may not run any git commands without the express permission of the user. This includes commits, pushes, branching, staging, and any other git operations. Always ask the user before executing a git command.

### DevCycle Document Creation

When the user asks an agent to create a DevCycle document, the agent must stop after creating the document. The agent may not begin implementation of the DevCycle plan until the user explicitly requests it.
