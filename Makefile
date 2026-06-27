# PatchPath developer shortcuts. Run `make help` for the list.
.DEFAULT_GOAL := help
.PHONY: help up down build logs migrate makemigrations superuser shell test test-cov lint seed fe-install fe-dev fe-build

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

up: ## Start the full stack (db + backend + frontend)
	docker compose up --build

down: ## Stop the stack (add ARGS=-v to drop the db volume)
	docker compose down $(ARGS)

build: ## Rebuild images without starting
	docker compose build

logs: ## Follow backend logs
	docker compose logs -f backend

migrate: ## Apply database migrations inside the backend container
	docker compose exec backend python manage.py migrate

makemigrations: ## Generate migrations inside the backend container
	docker compose exec backend python manage.py makemigrations

superuser: ## Create a Django superuser
	docker compose exec backend python manage.py createsuperuser

shell: ## Open a Django shell
	docker compose exec backend python manage.py shell

seed: ## Load demo user, project, and a sample diagnosed session
	docker compose exec backend python manage.py seed_demo

test: ## Run backend tests
	docker compose exec backend pytest

test-cov: ## Run backend tests with coverage
	docker compose exec backend pytest --cov=apps --cov-report=term-missing

lint: ## Run backend lint (ruff) and type checks if configured
	docker compose exec backend ruff check .

fe-install: ## Install frontend dependencies locally
	cd frontend && npm install

fe-dev: ## Run the frontend dev server locally
	cd frontend && npm run dev

fe-build: ## Build the frontend for production
	cd frontend && npm run build
