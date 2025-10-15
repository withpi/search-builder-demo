# Pi Search Builder

**Align your search quality with your domain expertise through intelligent feedback loops**

[🚀 **Live Demo**](https://pi-search-builder.vercel.app/) - Try it out now!

## Overview

Pi Search Builder transforms search quality from a black box into a transparent, iterative process. Rather than settling for generic relevance algorithms, you can align search results with your specific domain knowledge and user preferences through continuous feedback.

**[🎥 Watch Demo Video](https://youtu.be/zGpgjPb7Ntk)**

### The Problem

Traditional search solutions force you to choose between:
- Out-of-the-box algorithms that don't understand your domain
- Complex ML models that require extensive training data and expertise
- Manual tuning that doesn't scale with user feedback

### The Solution

Pi Search Builder bridges this gap by:
1. **Starting Simple**: Connect your data corpus and immediately search using semantic, keyword (BM25), or hybrid approaches
2. **Learning from Feedback**: Provide thumbs up/down ratings and commentary on search results
3. **Automating Improvement**: Pi automatically generates deterministic judges from your feedback that rerank results in real-time
4. **Continuous Alignment**: Your search quality evolves alongside your understanding and user needs

## Key Features

- 🚀 **Instant Setup**: Link your corpus and start searching immediately
- 🔍 **Flexible Search**: Choose between semantic, keyword, or hybrid search algorithms
- 👍 **Intuitive Feedback**: Simple thumbs up/down interface with optional commentary
- 🤖 **Automated Judges**: Feedback automatically becomes deterministic reranking rules
- ⚡ **Live Reranking**: Results improve in real-time as you provide feedback
- 🎯 **Domain Alignment**: Search quality reflects your expertise, not generic relevance

## Getting Started

1. **Connect Your Data**: Import your corpus of documents
2. **Issue Searches**: Start querying with semantic, keyword, or hybrid search
3. **Provide Feedback**: Rate results and add commentary on what works
4. **Watch It Learn**: Pi generates judges that rerank future results automatically

**New to Pi Search Builder?** Check out our [demo video](https://youtu.be/zGpgjPb7Ntk) to see it in action.

## Use Cases

- **Enterprise Search**: Tailor internal knowledge bases to your team's needs
- **E-commerce**: Align product search with customer preferences
- **Documentation**: Improve technical doc search based on developer feedback
- **Content Platforms**: Optimize content discovery for your audience

## Philosophy

Search quality isn't one-size-fits-all. Pi Search Builder recognizes that you are the expert in your domain. By translating your feedback into deterministic judges, we help you build search that truly understands what matters to your users.

## Running Locally

Search builder indexes each corpus entirely in memory; the only external services it uses are the Pi Labs API and OpenAI's GPT-4o. To run Search Builder locally, you will need API keys for each:
1. [Create a free account](https://withpi.account) with Pi Labs and visit https://withpi.ai/account/keys to get an API key
2. [Grab an API key from OpenAI](https://platform.openai.com/api-keys)
