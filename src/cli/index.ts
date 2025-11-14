#!/usr/bin/env node

import { Command } from 'commander'
import { getConfig } from '../utils/config.js'
import { OrchestratorAgent } from '../agents/orchestrator-agent.js'
import { createInterface } from 'readline'

const program = new Command()

program
  .name('cv-builder')
  .description('AI-powered CV builder with Claude agent orchestration')
  .version('0.1.0')

program
  .command('interactive')
  .alias('i')
  .description('Start interactive CLI session')
  .action(async () => {
    const config = getConfig()
    const orchestrator = new OrchestratorAgent(config.anthropicApiKey)

    console.log('CV Builder - Interactive Mode')
    console.log('Type "exit" or "quit" to end the session\n')

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'You: ',
    })

    rl.prompt()

    rl.on('line', async (input) => {
      const trimmed = input.trim()

      if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
        console.log('Goodbye!')
        rl.close()
        process.exit(0)
      }

      if (!trimmed) {
        rl.prompt()
        return
      }

      try {
        process.stdout.write('\nAssistant: ')
        await orchestrator.processRequestStreaming(trimmed, (chunk) => {
          process.stdout.write(chunk)
        })
        console.log('\n')
      } catch (error) {
        console.error('\nError:', error instanceof Error ? error.message : error)
        console.log()
      }

      rl.prompt()
    })

    rl.on('close', () => {
      process.exit(0)
    })
  })

program
  .command('generate')
  .alias('g')
  .description('Generate resume (headless mode)')
  .option('-j, --job <jobId>', 'Job ID to tailor resume for')
  .option('-o, --output <path>', 'Output path for generated resume')
  .option('-f, --format <format>', 'Output format (markdown, html, pdf)', 'markdown')
  .action(async (options) => {
    const config = getConfig()
    const orchestrator = new OrchestratorAgent(config.anthropicApiKey)

    let request = 'Generate my resume'
    if (options.job) {
      request += ` tailored for job ${options.job}`
    }

    try {
      console.log('Generating resume...\n')
      const response = await orchestrator.processRequest(request)
      console.log(response)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program
  .command('analyze')
  .alias('a')
  .description('Analyze a job listing')
  .argument('<jobId>', 'Job ID to analyze')
  .action(async (jobId) => {
    const config = getConfig()
    const orchestrator = new OrchestratorAgent(config.anthropicApiKey)

    try {
      console.log(`Analyzing job: ${jobId}\n`)
      const response = await orchestrator.processRequest(
        `Analyze the job listing with ID ${jobId} and tell me about key requirements and how well I match.`
      )
      console.log(response)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program
  .command('learn')
  .alias('l')
  .description('Generate learning path for a job')
  .argument('<jobId>', 'Job ID to create learning path for')
  .action(async (jobId) => {
    const config = getConfig()
    const orchestrator = new OrchestratorAgent(config.anthropicApiKey)

    try {
      console.log(`Creating learning path for job: ${jobId}\n`)
      const response = await orchestrator.processRequest(
        `Identify skills gaps for job ${jobId} and create a learning path with resources and exercises.`
      )
      console.log(response)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// Default to interactive mode if no command specified
if (!process.argv.slice(2).length) {
  program.parse(['node', 'cv-builder', 'interactive'])
} else {
  program.parse()
}
